import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";
import { requireRole } from "@/lib/request-auth";

const tables = { members: "members", coaches: "staff", store: "products", assets: "assets", finance: "finance_movements", reports: "finance_movements", settings: "app_settings" } as const;
type Section = keyof typeof tables;

function sectionOf(value: string): Section | null { return value in tables ? value as Section : null; }
function asRecord(section: Section, row: Record<string, unknown>) {
  if (section === "members") return { id: row.id, name: row.full_name, detail: `${row.plan_name} · ${row.training_schedule}`, status: row.membership_status, amount: row.monthly_fee };
  if (section === "coaches") return { id: row.id, name: row.full_name, detail: `${row.job_title} · ${row.compensation_type}`, status: row.employment_status, amount: row.monthly_amount };
  if (section === "store") return { id: row.id, name: row.name, detail: `${row.stock_quantity} قطعة متبقية · سعر البيع ${row.sale_price}`, status: row.stock_quantity && Number(row.stock_quantity) < 10 ? "مخزون منخفض" : "متوفر", amount: row.sale_price };
  if (section === "assets") return { id: row.id, name: row.name, detail: `${row.asset_type} · ${row.description ?? ""}`, status: row.status, amount: row.amount };
  if (section === "finance" || section === "reports") return { id: row.id, name: row.title, detail: `${row.account_name} · ${row.category}`, status: row.direction === "in" ? "دخل" : "مصروف", amount: row.amount };
  return { id: row.id, name: row.key, detail: String(row.value ?? ""), status: "نشط" };
}
function cleanText(value: unknown, max = 160) { return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""; }
function validAmount(value: unknown) { const amount = Number(value); return Number.isSafeInteger(amount) && amount >= 0 ? amount : null; }

export async function GET(request: Request, context: { params: Promise<{ section: string }> }) {
  const { section: raw } = await context.params; const section = sectionOf(raw);
  if (!section) return Response.json({ error: "قسم غير موجود" }, { status: 404 });
  if (section !== "store") {
    const allowed = section === "reports" ? ["admin", "investor"] as const : ["admin"] as const;
    const auth = await requireRole(request, [...allowed]); if (auth.response) return auth.response;
  }
  try {
    const query = section === "reports" ? "finance_movements?select=*&order=occurred_at.desc&limit=200" : section === "store" ? "products?select=*&active=eq.true&order=created_at.desc&limit=200" : `${tables[section]}?select=*&order=created_at.desc&limit=200`;
    const response = await supabaseRest(query); if (!response.ok) throw new Error("read failed");
    const rows = await response.json() as Array<Record<string, unknown>>;
    return Response.json({ records: rows.map((row) => asRecord(section, row)) });
  } catch { return Response.json({ error: "تعذر تحميل السجلات حالياً." }, { status: 503 }); }
}

export async function POST(request: Request, context: { params: Promise<{ section: string }> }) {
  const { section: raw } = await context.params; const section = sectionOf(raw);
  if (!section) return Response.json({ error: "قسم غير موجود" }, { status: 404 });
  if (section === "reports") return Response.json({ error: "التقارير للقراءة فقط." }, { status: 405 });
  const auth = await requireRole(request, ["admin"]); if (auth.response) return auth.response;
  const data = await request.json().catch(() => null) as { name?: unknown; detail?: unknown; amount?: unknown } | null;
  const name = cleanText(data?.name); const detail = cleanText(data?.detail, 300); const amount = validAmount(data?.amount);
  if (!name || amount === null) return Response.json({ error: "تحقق من الاسم والمبلغ." }, { status: 400 });
  try {
    assertWriteAccess();
    const payload: Record<string, unknown> = section === "members" ? { full_name: name, plan_name: detail || "باقة لياقة شهرية", training_schedule: "3 حصص أسبوعياً", monthly_fee: amount, membership_status: "نشط" }
      : section === "coaches" ? { full_name: name, job_title: detail || "كابتن", compensation_type: "راتب شهري", monthly_amount: amount, employment_status: "نشط" }
      : section === "store" ? { name, description: detail || "منتج متجر", stock_quantity: 0, sale_price: amount, cost_price: 0 }
      : section === "assets" ? { name, description: detail || "سجل جديد", asset_type: "مصروف", amount, status: "نشط" }
      : section === "settings" ? { key: name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 60), value: detail, description: "إعداد نادي" }
      : { title: name, account_name: detail || "إدارة النادي", category: "متفرقات", amount, direction: "in", payment_method: "نقدي" };
    const response = await supabaseRest(tables[section], { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("write failed");
    const [row] = await response.json() as Array<Record<string, unknown>>;
    await supabaseRest("audit_logs", { method: "POST", body: JSON.stringify({ actor_id: auth.session?.id, action: "create_record", entity_type: tables[section], entity_id: row.id, metadata: { section } }) });
    return Response.json({ record: asRecord(section, row) }, { status: 201 });
  } catch { return Response.json({ error: "تعذر الحفظ. تحقق من إعدادات Supabase وصلاحيات الإدارة." }, { status: 503 }); }
}
