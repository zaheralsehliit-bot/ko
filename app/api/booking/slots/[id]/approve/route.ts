import { audit, isUuid, text } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin"]); if (auth.response) return auth.response;
  const { id } = await context.params; if (!isUuid(id)) return Response.json({ error: "معرّف الموعد غير صالح." }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const status = text(body?.status, 16);
  if (status !== "approved" && status !== "rejected" && status !== "cancelled") return Response.json({ error: "حالة القرار غير صالحة." }, { status: 400 });
  try {
    assertWriteAccess();
    const payload = { status, approval_note: text(body?.note, 500) || null, approved_by: auth.session?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const result = await supabaseRest(`coach_availability?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    if (!result.ok || !(await result.clone().json() as unknown[]).length) return Response.json({ error: "الموعد غير موجود." }, { status: 404 });
    await audit(auth.session?.id, "review_coach_availability", "coach_availability", id, { status, note: payload.approval_note });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "تعذر اعتماد الموعد." }, { status: 503 }); }
}
