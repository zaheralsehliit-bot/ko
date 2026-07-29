import { audit, amount, isUuid, text } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

const serviceTypes = ["private_training", "group_training", "consultation", "online_training"] as const;
type ServiceType = (typeof serviceTypes)[number];

function validService(value: string): value is ServiceType { return serviceTypes.includes(value as ServiceType); }

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const scope = query.get("scope");
  const serviceType = query.get("serviceType") ?? "";
  if (serviceType && !validService(serviceType)) return Response.json({ error: "نوع الخدمة غير صالح." }, { status: 400 });

  let coachId = query.get("coachId") ?? "";
  const privateScope = scope === "mine";
  if (scope === "mine") {
    const auth = await requireRole(request, ["admin", "coach"]); if (auth.response) return auth.response;
    if (auth.session?.role === "coach") {
      coachId = auth.session.staffId ?? "";
      if (!isUuid(coachId)) return Response.json({ error: "حساب الكوتش غير مرتبط بملف موظف." }, { status: 409 });
    }
  }

  try {
    const filters = ["select=id,coach_id,service_type,starts_at,ends_at,capacity,price,meeting_url,status,approval_note,created_at,staff(id,full_name,job_title,avatar_url)", "order=starts_at.asc", "limit=250"];
    if (!privateScope) filters.push("status=eq.approved", `starts_at=gt.${encodeURIComponent(new Date().toISOString())}`);
    if (coachId && isUuid(coachId)) filters.push(`coach_id=eq.${coachId}`);
    if (serviceType) filters.push(`service_type=eq.${serviceType}`);
    const slotsResponse = await supabaseRest(`coach_availability?${filters.join("&")}`);
    if (!slotsResponse.ok) throw new Error("slots");
    const slots = await slotsResponse.json() as Array<{ id: string; capacity: number; [key: string]: unknown }>;
    const ids = slots.map(slot => slot.id);
    const bookingsResponse = ids.length ? await supabaseRest(`appointment_bookings?select=availability_id,party_size,status&availability_id=in.(${ids.join(",")})&status=eq.confirmed`) : null;
    if (bookingsResponse && !bookingsResponse.ok) throw new Error("bookings");
    const reserved = new Map<string, number>();
    if (bookingsResponse) for (const booking of await bookingsResponse.json() as Array<{ availability_id: string; party_size: number }>) reserved.set(booking.availability_id, (reserved.get(booking.availability_id) ?? 0) + Number(booking.party_size));
    return Response.json({ slots: slots.map(slot => ({ ...slot, reserved: reserved.get(slot.id) ?? 0, available: Math.max(0, Number(slot.capacity) - (reserved.get(slot.id) ?? 0)) })) });
  } catch { return Response.json({ error: "تعذر تحميل المواعيد حالياً." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "coach"]); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const coachId = text(body?.coachId, 40); const serviceType = text(body?.serviceType, 40); const startsAt = text(body?.startsAt, 40); const endsAt = text(body?.endsAt, 40);
  const capacity = amount(body?.capacity, true) ?? 1; const price = Number(body?.price ?? 0);
  if (!isUuid(coachId) || !validService(serviceType) || !startsAt || !endsAt || !Number.isFinite(price) || price < 0) return Response.json({ error: "أدخل بيانات الموعد بشكل صحيح." }, { status: 400 });
  const start = new Date(startsAt); const end = new Date(endsAt);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start <= new Date() || end <= start || capacity < 1 || capacity > 30) return Response.json({ error: "تحقق من الوقت والسعة؛ يجب أن يكون الموعد مستقبلياً." }, { status: 400 });
  if (auth.session?.role === "coach" && auth.session.staffId !== coachId) return Response.json({ error: "يمكنك إضافة أوقاتك المتاحة فقط." }, { status: 403 });
  try {
    assertWriteAccess();
    const status = auth.session?.role === "admin" ? "approved" : "proposed";
    const payload = { coach_id: coachId, service_type: serviceType, starts_at: start.toISOString(), ends_at: end.toISOString(), capacity, price, meeting_url: text(body?.meetingUrl, 500) || null, status, approved_by: status === "approved" ? auth.session?.id : null, approved_at: status === "approved" ? new Date().toISOString() : null };
    const result = await supabaseRest("coach_availability", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    if (!result.ok) throw new Error("insert");
    const [slot] = await result.json() as Array<{ id: string }>;
    await audit(auth.session?.id, "create_coach_availability", "coach_availability", slot?.id, { coachId, serviceType, status });
    return Response.json({ slot, status }, { status: 201 });
  } catch { return Response.json({ error: "تعذر حفظ الموعد. قد يوجد تعارض في البيانات." }, { status: 503 }); }
}
