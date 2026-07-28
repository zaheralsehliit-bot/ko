import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "coach"]); if (auth.response) return auth.response;
  try {
    const [staffResponse, coursesResponse, membersResponse, payoutsResponse] = await Promise.all([supabaseRest("staff?select=*&order=full_name.asc"), supabaseRest("courses?select=id,coach_id,name,status"), supabaseRest("members?select=id,assigned_coach_id&membership_status=eq.%D9%86%D8%B4%D8%B7"), supabaseRest("coach_payouts?select=staff_id,amount")]);
    if (!staffResponse.ok || !coursesResponse.ok || !membersResponse.ok || !payoutsResponse.ok) throw new Error();
    const [staff,courses,members,payouts] = await Promise.all([staffResponse.json(),coursesResponse.json(),membersResponse.json(),payoutsResponse.json()]) as [Array<Record<string,unknown>>,Array<{coach_id:string|null}>,Array<{assigned_coach_id:string|null}>,Array<{staff_id:string;amount:number}>];
    const visible = auth.session?.role === "coach" ? staff.filter(row => row.id === auth.session?.staffId) : staff;
    return Response.json({ coaches: visible.map(coach => ({ ...coach, activeCourses: courses.filter(c => c.coach_id === coach.id).length, traineeCount: members.filter(m => m.assigned_coach_id === coach.id).length, paidAmount: payouts.filter(p => p.staff_id === coach.id).reduce((sum,p) => sum + Number(p.amount),0), dueAmount: Number(coach.monthly_amount || 0) })) });
  } catch { return Response.json({ error: "تعذر تحميل الكباتن." }, { status: 503 }); }
}
