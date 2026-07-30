import { isUuid } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "coach"]); if (auth.response) return auth.response;
  const requestedCoach = new URL(request.url).searchParams.get("coachId") ?? "";
  const coachId = auth.session?.role === "coach" ? auth.session.staffId : (isUuid(requestedCoach) ? requestedCoach : null);
  if (auth.session?.role === "coach" && !isUuid(coachId ?? "")) return Response.json({ error: "حساب الكوتش غير مرتبط بملف موظف." }, { status: 409 });
  try {
    const settings = await supabaseRest("app_settings?select=value&key=eq.club_timezone&limit=1");
    const [timezoneSetting] = settings.ok ? await settings.json() as Array<{value:string}> : [];
    const timezone = timezoneSetting?.value || "Asia/Damascus";
    const agenda = await supabaseRest("rpc/today_online_agenda", { method: "POST", body: JSON.stringify({ p_timezone: timezone, p_coach_id: coachId }) });
    if (!agenda.ok) throw new Error(); const appointments = await agenda.json() as Array<{ status:string; starts_at:string }>;
    const now = Date.now(); const next = appointments.find(item => item.status === "confirmed" && new Date(item.starts_at).valueOf() >= now) ?? null;
    const stats = { total: appointments.length, next, completed: appointments.filter(item=>item.status==="completed").length, cancelled: appointments.filter(item=>item.status==="cancelled").length, noShow: appointments.filter(item=>item.status==="no_show").length, pending: appointments.filter(item=>item.status==="pending").length };
    return Response.json({ timezone, appointments, stats });
  } catch { return Response.json({ error: "تعذر تحميل جدول اليوم." }, { status: 503 }); }
}
