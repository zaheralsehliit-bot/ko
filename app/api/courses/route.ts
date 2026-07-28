import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "coach", "customer"]); if (auth.response) return auth.response;
  try {
    const filter = auth.session?.role === "coach" ? `&coach_id=eq.${auth.session.staffId}` : "";
    const [coursesResponse, subscriptionsResponse, sessionsResponse] = await Promise.all([supabaseRest(`courses?select=*,staff(id,full_name,specialties)&order=created_at.desc${filter}`),supabaseRest("subscriptions?select=course_id,status"),supabaseRest("course_sessions?select=course_id,day_of_week,start_time,end_time,room")]);
    if (!coursesResponse.ok || !subscriptionsResponse.ok || !sessionsResponse.ok) throw new Error();
    const [courses,subscriptions,sessions] = await Promise.all([coursesResponse.json(),subscriptionsResponse.json(),sessionsResponse.json()]) as [Array<Record<string,unknown>>,Array<{course_id:string;status:string}>,Array<{course_id:string;day_of_week:number;start_time:string;end_time:string;room:string|null}>];
    return Response.json({ courses: courses.map(course => ({ ...course, enrolledCount: subscriptions.filter(s => s.course_id === course.id && s.status === "نشط").length, sessions: sessions.filter(s => s.course_id === course.id) })) });
  } catch { return Response.json({ error: "تعذر تحميل الدورات." }, { status: 503 }); }
}
