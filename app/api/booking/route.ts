import { audit, isUuid, text } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "customer"]); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const availabilityId = text(body?.availabilityId, 40);
  const requestedMemberId = text(body?.memberId, 40);
  const memberId = auth.session?.role === "customer" ? auth.session.memberId : requestedMemberId;
  const partySize = Number(body?.partySize ?? 1);
  const guestNames = Array.isArray(body?.guestNames) ? body!.guestNames.filter((name): name is string => typeof name === "string").map(name => text(name, 80)).filter(Boolean).slice(0, 9) : [];
  if (!isUuid(availabilityId) || !isUuid(memberId ?? "") || !Number.isInteger(partySize) || partySize < 1 || partySize > 10 || guestNames.length > Math.max(0, partySize - 1)) return Response.json({ error: "بيانات الحجز غير صالحة." }, { status: 400 });
  try {
    assertWriteAccess();
    const result = await supabaseRest("rpc/book_coach_slot", { method: "POST", body: JSON.stringify({ p_availability_id: availabilityId, p_member_id: memberId, p_party_size: partySize, p_guest_names: guestNames, p_notes: text(body?.notes, 500) || null }) });
    if (!result.ok) {
      const details = await result.json().catch(() => null) as { message?: string } | null;
      const message = details?.message || "تعذر إتمام الحجز.";
      return Response.json({ error: message.includes("fully") ? "هذا الموعد اكتملت سعته." : message.includes("already") ? "لديك حجز مسبق في هذا الموعد." : "لم يعد الموعد متاحاً." }, { status: 409 });
    }
    const booking = await result.json() as { id?: string };
    await audit(auth.session?.id, "book_appointment", "appointment_bookings", booking.id, { availabilityId, memberId, partySize });
    return Response.json({ booking }, { status: 201 });
  } catch { return Response.json({ error: "تعذر إتمام الحجز حالياً." }, { status: 503 }); }
}

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "coach", "customer"]); if (auth.response) return auth.response;
  try {
    const filters = ["select=id,party_size,guest_names,notes,status,created_at,coach_availability(id,service_type,starts_at,ends_at,price,meeting_url,staff(full_name,job_title))", "order=created_at.desc", "limit=100"];
    if (auth.session?.role === "customer") filters.push(`member_id=eq.${auth.session.memberId}`);
    if (auth.session?.role === "coach") filters.push(`coach_availability.coach_id=eq.${auth.session.staffId}`);
    const result = await supabaseRest(`appointment_bookings?${filters.join("&")}`);
    if (!result.ok) throw new Error();
    return Response.json({ bookings: await result.json() });
  } catch { return Response.json({ error: "تعذر تحميل حجوزاتك." }, { status: 503 }); }
}
