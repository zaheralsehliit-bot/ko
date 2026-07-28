import { isUuid } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; if (!isUuid(id)) return Response.json({ error: "معرّف الدورة غير صالح." }, { status: 400 });
  const auth = await requireRole(request, ["admin", "coach", "customer"]); if (auth.response) return auth.response;
  try {
    const courseResponse = await supabaseRest(`courses?select=*,staff(id,full_name,staff_code,phone,specialties)&id=eq.${id}&limit=1`); if (!courseResponse.ok) throw new Error(); const [course] = await courseResponse.json() as Array<Record<string,unknown>>; if (!course) return Response.json({ error: "الدورة غير موجودة." }, { status: 404 });
    if (auth.session?.role === "coach" && course.coach_id !== auth.session.staffId) return Response.json({ error: "لا تملك صلاحية هذه الدورة." }, { status: 403 });
    const [sessions,subscriptions,attendance] = await Promise.all([supabaseRest(`course_sessions?select=*&course_id=eq.${id}&order=day_of_week.asc,start_time.asc`),supabaseRest(`subscriptions?select=*,members(id,member_code,full_name,phone,avatar_url)&course_id=eq.${id}&order=end_date.desc`),supabaseRest(`attendance?select=id,status,attended_at,member_id&course_id=eq.${id}&order=attended_at.desc&limit=300`)]);
    const parse = async (response: Response) => response.ok ? response.json() : []; const [sessionRows,subscriptionRows,attendanceRows] = await Promise.all([sessions,subscriptions,attendance].map(parse));
    const revenue = subscriptionRows.filter((s: {status:string}) => s.status === "نشط").reduce((sum: number,s: {amount:number}) => sum + Number(s.amount),0);
    return Response.json({ course, sessions: sessionRows, subscriptions: subscriptionRows, attendance: attendanceRows, revenue });
  } catch { return Response.json({ error: "تعذر تحميل تفاصيل الدورة." }, { status: 503 }); }
}
