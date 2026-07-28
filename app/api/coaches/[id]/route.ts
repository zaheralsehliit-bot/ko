import { isUuid } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; if (!isUuid(id)) return Response.json({ error: "معرّف الكابتن غير صالح." }, { status: 400 });
  const auth = await requireRole(request, ["admin", "coach"]); if (auth.response) return auth.response;
  if (auth.session?.role === "coach" && auth.session.staffId !== id) return Response.json({ error: "لا تملك صلاحية هذا الملف." }, { status: 403 });
  try {
    const coachResponse = await supabaseRest(`staff?select=*&id=eq.${id}&limit=1`); if (!coachResponse.ok) throw new Error(); const [coach] = await coachResponse.json() as Array<Record<string,unknown>>; if (!coach) return Response.json({ error: "الكابتن غير موجود." }, { status: 404 });
    const [courses,payouts,members,sessions] = await Promise.all([supabaseRest(`courses?select=*&coach_id=eq.${id}&order=created_at.desc`),supabaseRest(`coach_payouts?select=*&staff_id=eq.${id}&order=paid_at.desc`),supabaseRest(`members?select=id,member_code,full_name,phone,membership_status,renewal_date&assigned_coach_id=eq.${id}&order=full_name.asc`),supabaseRest(`course_sessions?select=*,courses(name)&coach_id=eq.${id}&order=day_of_week.asc,start_time.asc`)]);
    const parse = async (response: Response) => response.ok ? response.json() : []; const [courseRows,payoutRows,memberRows,sessionRows] = await Promise.all([courses,payouts,members,sessions].map(parse));
    const paidAmount = payoutRows.reduce((sum: number, payout: {amount:number}) => sum + Number(payout.amount), 0);
    return Response.json({ coach, courses: courseRows, payouts: payoutRows, members: memberRows, sessions: sessionRows, paidAmount, dueAmount: Math.max(0, Number(coach.monthly_amount || 0) - paidAmount) });
  } catch { return Response.json({ error: "تعذر تحميل ملف الكابتن." }, { status: 503 }); }
}
