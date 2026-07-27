import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";
import { requireRole } from "@/lib/request-auth";

function text(value: unknown, max = 160) { return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""; }
function amountOf(value: unknown) { const amount = Number(value); return Number.isSafeInteger(amount) && amount > 0 ? amount : null; }

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "investor"]); if (auth.response) return auth.response;
  try {
    const response = await supabaseRest("finance_movements?select=*&order=occurred_at.desc&limit=100");
    if (!response.ok) throw new Error("read failed");
    const rows = await response.json() as Array<{ id: string; title: string; account_name: string; category: string; amount: number; direction: "in" | "out"; payment_method: string; occurred_at: string }>;
    return Response.json({ movements: rows.map((row) => ({ id: row.id, title: row.title, accountName: row.account_name, category: row.category, amount: row.amount, direction: row.direction, paymentMethod: row.payment_method, createdAt: row.occurred_at })) });
  } catch { return Response.json({ error: "تعذر تحميل الحركة المالية." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]); if (auth.response) return auth.response;
  const data = await request.json().catch(() => null) as Partial<{ title: unknown; accountName: unknown; category: unknown; amount: unknown; direction: unknown; paymentMethod: unknown; idempotencyKey: unknown }> | null;
  const title = text(data?.title); const accountName = text(data?.accountName); const category = text(data?.category); const amount = amountOf(data?.amount);
  const direction = data?.direction === "in" || data?.direction === "out" ? data.direction : null;
  const paymentMethod = text(data?.paymentMethod) || "نقدي"; const idempotencyKey = text(data?.idempotencyKey, 100) || crypto.randomUUID();
  if (!title || !accountName || !category || !direction || amount === null) return Response.json({ error: "تحقق من بيانات الحركة والمبلغ." }, { status: 400 });
  try {
    assertWriteAccess();
    const response = await supabaseRest("finance_movements", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title, account_name: accountName, category, amount, direction, payment_method: paymentMethod, idempotency_key: idempotencyKey }) });
    if (!response.ok && response.status !== 409) throw new Error("write failed");
    const created = response.ok;
    const rows = created ? await response.json() as Array<{ id: string }> : [];
    const row = rows[0] ?? (await (await supabaseRest(`finance_movements?select=id&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`)).json() as Array<{ id: string }>)[0];
    if (!row) throw new Error("movement missing");
    if (created) await supabaseRest("audit_logs", { method: "POST", body: JSON.stringify({ actor_id: auth.session?.id, action: "create_finance_movement", entity_type: "finance_movements", entity_id: row.id, metadata: { direction, amount, category } }) });
    return Response.json({ movement: { id: row.id } }, { status: created ? 201 : 200 });
  } catch { return Response.json({ error: "تعذر حفظ الحركة. لم يتم إنشاء فاتورة أو رصيد بديل." }, { status: 503 }); }
}
