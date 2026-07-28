import { isUuid } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; if (!isUuid(id)) return Response.json({ error: "معرّف المتدرب غير صالح." }, { status: 400 });
  const auth = await requireRole(request, ["admin", "coach", "customer"]); if (auth.response) return auth.response;
  try {
    const memberResponse = await supabaseRest(`members?select=*,assigned_coach:staff!members_assigned_coach_id_fkey(id,full_name,staff_code,phone,specialties)&id=eq.${id}&limit=1`); if (!memberResponse.ok) throw new Error();
    const [member] = await memberResponse.json() as Array<Record<string, unknown>>; if (!member) return Response.json({ error: "المتدرب غير موجود." }, { status: 404 });
    if (auth.session?.role === "customer" && auth.session.memberId !== id) return Response.json({ error: "لا تملك صلاحية هذا الملف." }, { status: 403 });
    if (auth.session?.role === "coach" && auth.session.staffId !== member.assigned_coach_id) return Response.json({ error: "هذا المتدرب غير مخصص لك." }, { status: 403 });
    const [subscriptions, payments, invoices, attendance, progress, measurements, notes] = await Promise.all([
      supabaseRest(`subscriptions?select=*,courses(id,name,course_code,monthly_price,schedule)&member_id=eq.${id}&order=end_date.desc`), supabaseRest(`payments?select=*&member_id=eq.${id}&order=paid_at.desc`), supabaseRest(`invoices?select=*&member_id=eq.${id}&order=issued_at.desc`), supabaseRest(`attendance?select=*,courses(name)&member_id=eq.${id}&order=attended_at.desc&limit=50`), supabaseRest(`progress_logs?select=*&member_id=eq.${id}&order=logged_at.desc`), supabaseRest(`measurements?select=*&member_id=eq.${id}&order=measured_at.desc`), supabaseRest(`member_notes?select=*,staff(full_name)&member_id=eq.${id}&order=created_at.desc`)
    ]);
    const parse = async (response: Response) => response.ok ? response.json() : [];
    const [subscriptionRows,paymentRows,invoiceRows,attendanceRows,progressRows,measurementRows,noteRows] = await Promise.all([subscriptions,payments,invoices,attendance,progress,measurements,notes].map(parse));
    return Response.json({ member, subscriptions: subscriptionRows, payments: paymentRows, invoices: invoiceRows, attendance: attendanceRows, progress: progressRows, measurements: measurementRows, notes: noteRows });
  } catch { return Response.json({ error: "تعذر تحميل ملف المتدرب." }, { status: 503 }); }
}
