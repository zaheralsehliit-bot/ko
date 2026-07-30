import { createHmac, timingSafeEqual } from "node:crypto";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

type CalPerson = { name?: string; email?: string; phoneNumber?: string };
type CalPayload = {
  uid?: string; id?: string | number; type?: string; title?: string; startTime?: string; endTime?: string;
  status?: string; attendees?: CalPerson[]; organizer?: CalPerson; user?: CalPerson; description?: string;
  additionalNotes?: string; location?: string; metadata?: Record<string, unknown>; responses?: Record<string, { value?: unknown }>;
  rescheduleUid?: string; cancellationReason?: string; cancellationReasonText?: string; cancelUrl?: string; rescheduleUrl?: string;
  createdAt?: string; timeZone?: string;
};

function safeEqual(signature: string | null, body: string, secret: string) {
  if (!signature) return false;
  const actual = signature.replace(/^sha256=/i, "");
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function calStatus(event: string, payload: CalPayload) {
  if (event === "BOOKING_CANCELLED") return "cancelled";
  if (event === "BOOKING_RESCHEDULED") return "rescheduled";
  if (event === "BOOKING_REJECTED") return "cancelled";
  if (event === "BOOKING_NO_SHOW_UPDATED") return "no_show";
  return String(payload.status || "confirmed").toLowerCase() === "pending" ? "pending" : "confirmed";
}

function readReason(payload: CalPayload) {
  const responses = payload.responses ?? {};
  for (const key of ["booking_reason", "goal", "reason", "notes"]) {
    const value = responses[key]?.value;
    if (typeof value === "string") return value.slice(0, 1000);
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Cal webhook is not configured." }, { status: 503 });
  const raw = await request.text();
  if (!safeEqual(request.headers.get("x-cal-signature-256"), raw, secret)) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  let event: string; let payload: CalPayload;
  try { const parsed = JSON.parse(raw) as { triggerEvent?: string; payload?: CalPayload } & CalPayload; event = String(parsed.triggerEvent || ""); payload = parsed.payload ?? parsed; } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!event || !payload.uid) return Response.json({ error: "Missing Cal booking reference." }, { status: 400 });
  if (!["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED", "BOOKING_REJECTED", "BOOKING_NO_SHOW_UPDATED"].includes(event)) return Response.json({ ok: true, ignored: true });
  try {
    assertWriteAccess();
    const attendee = payload.attendees?.[0] ?? {};
    const organizerEmail = payload.organizer?.email ?? payload.user?.email ?? "";
    const coachResult = organizerEmail ? await supabaseRest(`staff?select=id&email=eq.${encodeURIComponent(organizerEmail)}&limit=1`) : null;
    const coaches = coachResult?.ok ? await coachResult.json() as Array<{ id: string }> : [];
    let memberId: string | null = null;
    if (attendee.email) {
      const memberResult = await supabaseRest(`members?select=id&email=eq.${encodeURIComponent(attendee.email)}&limit=1`);
      const members = memberResult.ok ? await memberResult.json() as Array<{ id: string }> : [];
      memberId = members[0]?.id ?? null;
      if (!memberId && event === "BOOKING_CREATED") {
        const created = await supabaseRest("members", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ full_name: attendee.name || "عميل KO", email: attendee.email, phone: attendee.phoneNumber ?? null, whatsapp: attendee.phoneNumber ?? null }) });
        const rows = created.ok ? await created.json() as Array<{ id: string }> : [];
        memberId = rows[0]?.id ?? null;
      }
    }
    const meeting = typeof payload.metadata?.videoCallUrl === "string" ? payload.metadata.videoCallUrl : (payload.location?.startsWith("http") ? payload.location : null);
    const now = new Date().toISOString();
    const record = { cal_uid: payload.uid, cal_event_id: payload.id ? String(payload.id) : null, cal_event_type: payload.type || payload.title || "online_training", member_id: memberId, coach_id: coaches[0]?.id ?? null, attendee_name: attendee.name || "عميل KO", attendee_email: attendee.email ?? null, attendee_phone: attendee.phoneNumber ?? null, booking_reason: readReason(payload), notes: payload.additionalNotes || payload.description || null, starts_at: payload.startTime, ends_at: payload.endTime, timezone: payload.timeZone || "Asia/Damascus", status: calStatus(event, payload), meeting_url: meeting, cancel_url: payload.cancelUrl ?? null, reschedule_url: payload.rescheduleUrl ?? null, cancellation_reason: payload.cancellationReason || payload.cancellationReasonText || null, cal_created_at: payload.createdAt ?? null, last_webhook_at: now, updated_at: now };
    if (!record.starts_at || !record.ends_at) return Response.json({ error: "Missing booking time." }, { status: 400 });
    const write = await supabaseRest("cal_booking_sync?on_conflict=cal_uid", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(record) });
    if (!write.ok) throw new Error("Cal booking mirror failed");
    const rows = await write.json() as Array<{ id: string }>;
    if (event === "BOOKING_CREATED") {
      const profileResult = await supabaseRest("profiles?select=id,role,staff_id&or=(role.eq.admin,staff_id.eq." + (coaches[0]?.id ?? "00000000-0000-0000-0000-000000000000") + ")");
      const profiles = profileResult.ok ? await profileResult.json() as Array<{ id: string }> : [];
      if (profiles.length) await supabaseRest("dashboard_notifications", { method: "POST", body: JSON.stringify(profiles.map(profile => ({ profile_id: profile.id, notification_type: "cal_booking_created", title: "حجز أونلاين جديد", body: `${attendee.name || "عميل جديد"} — ${payload.type || payload.title || "جلسة أونلاين"}`, action_url: "/dashboard/today", related_booking_id: null }))) });
    }
    return Response.json({ ok: true, bookingId: rows[0]?.id });
  } catch {
    return Response.json({ error: "Unable to synchronize Cal booking." }, { status: 503 });
  }
}
