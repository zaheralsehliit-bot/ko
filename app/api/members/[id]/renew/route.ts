import { amount, isUuid, text } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; if (!isUuid(id)) return Response.json({ error: "معرّف المتدرب غير صالح." }, { status: 400 });
  const auth = await requireRole(request, ["admin"]); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as Record<string,unknown> | null; const courseId = text(body?.courseId, 50); const endDate = text(body?.endDate, 20); const value = amount(body?.amount); const paid = body?.paid !== false; const method = text(body?.method,50) || "نقدي"; const key = text(body?.idempotencyKey,100) || crypto.randomUUID();
  if (!isUuid(courseId) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || value === null) return Response.json({ error: "بيانات التجديد غير مكتملة." }, { status: 400 });
  try {
    assertWriteAccess();
    const response = await supabaseRest("rpc/renew_membership", { method: "POST", body: JSON.stringify({ p_member_id: id, p_course_id: courseId, p_end_date: endDate, p_amount: value, p_paid: paid, p_method: method, p_idempotency_key: key }) });
    if (!response.ok) throw new Error(); return Response.json({ renewal: await response.json() }, { status: 201 });
  } catch { return Response.json({ error: "تعذر إتمام التجديد. لم يتم تسجيل عملية جزئية." }, { status: 503 }); }
}
