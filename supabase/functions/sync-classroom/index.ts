import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-google-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GoogleCourse = {
  id: string;
  name?: string;
};

type GoogleCourseWork = {
  id: string;
  title?: string;
  description?: string | null;
  creationTime?: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  dueTime?: {
    hours?: number;
    minutes?: number;
  };
};

type GoogleCoursesResponse = {
  courses?: GoogleCourse[];
};

type GoogleCourseWorkResponse = {
  courseWork?: GoogleCourseWork[];
};

class HttpError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseBearerToken = (authHeader: string | null) => {
  if (!authHeader) throw new HttpError(401, "Missing Authorization header.");
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError(401, "Malformed Authorization header.");
  }
  return token;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const token = parseBearerToken(req.headers.get("Authorization") ?? req.headers.get("authorization"));
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new HttpError(500, "Supabase environment variables are missing.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new HttpError(401, "Unauthorized.");

    const headerGoogleToken = req.headers.get("x-google-token");
    const metadataGoogleToken = typeof user.user_metadata?.provider_token === "string"
      ? user.user_metadata.provider_token
      : null;
    const googleAccessToken = headerGoogleToken ?? metadataGoogleToken;

    if (!googleAccessToken) {
      throw new HttpError(
        400,
        "Google access token not found. Sign out and sign in with Google again."
      );
    }

    const coursesRes = await fetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=30",
      { headers: { Authorization: `Bearer ${googleAccessToken}` } }
    );

    if (coursesRes.status === 401 || coursesRes.status === 403) {
      throw new HttpError(
        401,
        "Google Classroom access expired. Sign out and sign in with Google again."
      );
    }

    if (!coursesRes.ok) {
      const err = await coursesRes.text();
      throw new HttpError(502, "Google Classroom courses request failed.", err);
    }

    const coursesData = await coursesRes.json() as GoogleCoursesResponse;
    const googleCourses = coursesData.courses ?? [];

    let colorIndex = 0;
    const courseIdMap: Record<string, string> = {};
    const skippedCourses: string[] = [];

    for (const gc of googleCourses) {
      const { data: existing, error: existingErr } = await supabase
        .from("courses")
        .select("id, color_index")
        .eq("user_id", user.id)
        .eq("google_course_id", gc.id)
        .maybeSingle();

      if (existingErr) {
        throw new HttpError(500, "Failed checking existing courses.", existingErr.message);
      }

      if (existing) {
        courseIdMap[gc.id] = existing.id;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("courses")
          .insert({
            user_id: user.id,
            google_course_id: gc.id,
            title: gc.name || "Untitled Course",
            color_index: colorIndex++,
          })
          .select("id")
          .single();

        if (insertErr) throw new HttpError(500, "Failed saving courses.", insertErr.message);
        courseIdMap[gc.id] = inserted.id;
      }
    }

    let totalAssignments = 0;

    for (const gc of googleCourses) {
      const courseWorkUrl = new URL(
        `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(gc.id)}/courseWork`
      );
      courseWorkUrl.searchParams.set("pageSize", "100");
      courseWorkUrl.searchParams.set("orderBy", "dueDate desc");

      const cwRes = await fetch(
        courseWorkUrl.toString(),
        { headers: { Authorization: `Bearer ${googleAccessToken}` } }
      );

      if (cwRes.status === 401 || cwRes.status === 403) {
        throw new HttpError(
          401,
          "Google Classroom access expired. Sign out and sign in with Google again."
        );
      }

      if (!cwRes.ok) {
        skippedCourses.push(gc.id);
        continue;
      }

      const cwData = await cwRes.json() as GoogleCourseWorkResponse;
      const courseWork = cwData.courseWork ?? [];

      for (const cw of courseWork) {
        let dueDate: string | null = null;
        if (cw.dueDate) {
          const { year, month, day } = cw.dueDate;
          const hours = cw.dueTime?.hours ?? 23;
          const minutes = cw.dueTime?.minutes ?? 59;
          dueDate = new Date(Date.UTC(year, month - 1, day, hours, minutes)).toISOString();
        }

        const { error: upsertErr } = await supabase
          .from("assignments")
          .upsert(
            {
              user_id: user.id,
              course_id: courseIdMap[gc.id],
              google_assignment_id: cw.id,
              title: cw.title || "Untitled",
              description: cw.description || null,
              due_date: dueDate,
              posted_date: cw.creationTime || null,
            },
            { onConflict: "user_id,google_assignment_id" }
          );

        if (upsertErr) {
          throw new HttpError(500, "Failed saving assignments.", upsertErr.message);
        }
        totalAssignments++;
      }
    }

    return jsonResponse(
      {
        success: true,
        coursesCount: googleCourses.length,
        assignmentsCount: totalAssignments,
        skippedCourses,
      }
    );
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      console.error("[sync-classroom]", err.status, err.message, err.details ?? "");
      return jsonResponse({ error: err.message, details: err.details }, err.status);
    }

    const message = err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[sync-classroom] unexpected", err);
    return jsonResponse({ error: message }, 500);
  }
});
