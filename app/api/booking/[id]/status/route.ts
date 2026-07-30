import { audit, isUuid, text } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

const statuses = ["completed", "cancelled", "no_show", "confirmed"] as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin", "coach"]); if (auth.response) return auth.response;
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = text(body?.status, 20);
  if (!isUuid(id) || !statuses.includes(status as typeof statuses[number])) return Response.json({ error: "بيانات تحديث الحجز غير صالحة." }, { status: 400 });
  try {
    assertWriteAccess();
    const club = await supabaseRest(`appointment_bookings?select=id,coach_availability!inner(coach_id)&id=eq.${id}&limit=1`);
    const clubRows = club.ok ? await club.json() as Array<{ id: string; coach_availability: { coach_id: string } }> : [];
    if (clubRows.length) {
      if (auth.session?.role === "coach" && clubRows[0].coach_availability.coach_id !== auth.session.staffId) return Response.json({ error: "لا تملك صلاحية هذا الحجز." }, { status: 403 });
      const result = await supabaseRest(`appointment_bookings?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status, cancelled_at: status === "cancelled" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }) });
      if (!result.ok) throw new Error(); await audit(auth.session?.id, "update_booking_status", "appointment_bookings", id, { status }); return Response.json({ ok: true });
    }
    const hosted = await supabaseRest(`cal_booking_sync?select=id,cal_uid,coach_id&id=eq.${id}&limit=1`);
    const hostedRows = hosted.ok ? await hosted.json() as Array<{ id: string; cal_uid: string; coach_id: string | null }> : [];
    if (!hostedRows.length) return Response.json({ error: "الحجز غير موجود." }, { status: 404 });
    if (auth.session?.role === "coach" && hostedRows[0].coach_id !== auth.session.staffId) return Response.json({ error: "لا تملك صلاحية هذا الحجز." }, { status: 403 });
    if (status === "cancelled") {
      const key = process.env.CAL_API_KEY;
      if (!key) return Response.json({ error: "إلغاء حجز Cal.com يتطلب CAL_API_KEY على الخادم." }, { status: 503 });
      const cancel = await fetch(`https://api.cal.com/v2/bookings/${encodeURIComponent(hostedRows[0].cal_uid)}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "cal-api-version": "2026-02-25" }, body: JSON.stringify({ cancellationReason: "Cancelled from KO Fighters dashboard" }) });
      if (!cancel.ok) return Response.json({ error: "تعذر إلغاء الموعد لدى Cal.com." }, { status: 502 });
    }
    const result = await supabaseRest(`cal_booking_sync?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
    if (!result.ok) throw new Error(); await audit(auth.session?.id, "update_cal_booking_status", "cal_booking_sync", id, { status }); return Response.json({ ok: true });
  } catch { return Response.json({ error: "تعذر تحديث حالة الحجز." }, { status: 503 }); }
}
