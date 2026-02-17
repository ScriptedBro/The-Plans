import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Assignment, Course } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export function useAssignments() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const hasAttemptedInitialSync = useRef(false);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const [coursesRes, assignmentsRes] = await Promise.all([
      supabase.from("courses").select("*").order("title"),
      supabase.from("assignments").select("*, courses(*)").order("due_date", { ascending: true }),
    ]);

    if (coursesRes.data) setCourses(coursesRes.data);
    if (assignmentsRes.data) setAssignments(assignmentsRes.data as Assignment[]);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runSync = useCallback(async (silent: boolean) => {
    if (!session) return;
    setSyncing(true);
    try {
      const getValidTokens = async () => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error("Session expired. Please sign in again.");
        }

        const currentSession = sessionData.session;
        const expiresAtMs = currentSession.expires_at ? currentSession.expires_at * 1000 : 0;
        const shouldRefresh = !expiresAtMs || expiresAtMs - Date.now() < 60_000;

        if (!shouldRefresh) {
          return {
            accessToken: currentSession.access_token,
            googleToken: currentSession.provider_token ?? undefined,
          };
        }

        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session) {
          throw new Error("Session expired. Please sign in again.");
        }

        return {
          accessToken: refreshed.session.access_token,
          googleToken: refreshed.session.provider_token ?? undefined,
        };
      };

      const invokeSync = (tokens: { accessToken: string; googleToken?: string }) =>
        supabase.functions.invoke("sync-classroom", {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            ...(tokens.googleToken ? { "x-google-token": tokens.googleToken } : {}),
          },
        });

      let tokens = await getValidTokens();
      let { data, error } = await invokeSync(tokens);

      const statusCode =
        error && typeof error === "object" && "context" in error
          ? (error as { context?: { status?: number } }).context?.status
          : undefined;

      // Edge functions return 401 when the JWT is stale/expired. Refresh once and retry.
      if (statusCode === 401) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session) {
          throw new Error("Session expired. Please sign in again.");
        }

        tokens = {
          accessToken: refreshed.session.access_token,
          googleToken: refreshed.session.provider_token ?? undefined,
        };
        const retry = await invokeSync(tokens);
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      if (!silent) {
        toast({
          title: "✅ Sync complete!",
          description: `Synced ${data?.assignmentsCount ?? 0} assignments from ${data?.coursesCount ?? 0} courses.`,
        });
      }

      await fetchData();
    } catch (err: unknown) {
      let description = "Could not sync with Google Classroom.";

      if (err && typeof err === "object" && "context" in err) {
        const context = (err as { context?: Response }).context;
        if (context) {
          try {
            const payload = await context.clone().json() as { error?: string; details?: string };
            if (payload.error) {
              description = payload.error;
              if (payload.details) description = `${payload.error} (${payload.details})`;
            }
          } catch {
            // Fallback to generic error message below.
          }
        }
      }

      if (
        description === "Could not sync with Google Classroom." &&
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        description = (err as { message: string }).message;
      }

      if (!silent) {
        toast({
          title: "Sync failed",
          description,
          variant: "destructive",
        });
      }
    } finally {
      setSyncing(false);
    }
  }, [fetchData, session, toast]);

  const syncAssignments = useCallback(async () => {
    await runSync(false);
  }, [runSync]);

  useEffect(() => {
    if (!session || loading || syncing || hasAttemptedInitialSync.current) return;
    if (courses.length > 0 || assignments.length > 0) return;

    hasAttemptedInitialSync.current = true;
    void runSync(true);
  }, [assignments.length, courses.length, loading, runSync, session, syncing]);

  const toggleComplete = async (assignmentId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? { ...a, is_completed: newStatus, completed_at: newStatus ? new Date().toISOString() : null }
          : a
      )
    );

    const { error } = await supabase
      .from("assignments")
      .update({
        is_completed: newStatus,
        completed_at: newStatus ? new Date().toISOString() : null,
      })
      .eq("id", assignmentId);

    if (error) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId ? { ...a, is_completed: currentStatus } : a
        )
      );
      toast({ title: "Error updating assignment", variant: "destructive" });
    }
  };

  return { assignments, courses, loading, syncing, syncAssignments, toggleComplete };
}
