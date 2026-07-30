import { isUuid, text } from "@/lib/api-utils";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const availabilityId = text(body?.availabilityId, 40); const fullName = text(body?.fullName, 140); const whatsapp = text(body?.whatsapp, 30); const notes = text(body?.notes, 500);
  if (!isUuid(availabilityId) || !fullName || !whatsapp) return Response.json({ error: "أدخل الاسم ورقم واتساب والموعد." }, { status: 400 });
  try {
    assertWriteAccess();
    const matching = await supabaseRest(`members?select=id&or=(phone.eq.${encodeURIComponent(whatsapp)},whatsapp.eq.${encodeURIComponent(whatsapp)})&limit=1`);
    if (!matching.ok) throw new Error(); let [member] = await matching.json() as Array<{ id: string }>;
    if (!member) { const created = await supabaseRest("members", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ full_name: fullName, member_code: `WEB-${crypto.randomUUID().slice(0,8).toUpperCase()}`, phone: whatsapp, whatsapp, membership_status: "مبدئي", plan_name: "حجز أونلاين", training_schedule: "يحدد لاحقاً", monthly_fee: 0 }) }); if (!created.ok) throw new Error(); [member] = await created.json() as Array<{ id: string }>; }
    const booked = await supabaseRest("rpc/book_coach_slot", { method: "POST", body: JSON.stringify({ p_availability_id: availabilityId, p_member_id: member.id, p_party_size: 1, p_guest_names: [], p_notes: notes || null }) });
    if (!booked.ok) return Response.json({ error: "الموعد لم يعد متاحاً أو تم حجزه مسبقاً." }, { status: 409 });
    return Response.json({ ok: true, booking: await booked.json() }, { status: 201 });
  } catch { return Response.json({ error: "تعذر تأكيد الحجز الآن." }, { status: 503 }); }
}
