import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrateSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      if (!initialSession) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Use locally persisted session immediately, then validate/refresh in background.
      setSession(initialSession);
      setUser(initialSession.user ?? null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData.user) {
        setUser(userData.user);
        setLoading(false);
        return;
      }

      // In production this can briefly return 401 during startup; refresh once before forcing logout.
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshed.session) {
        setSession(refreshed.session);
        setUser(refreshed.session.user ?? null);
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    void hydrateSession();

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes:
          "openid email profile https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
