import { assertWriteAccess, supabaseRest } from "../../../../lib/supabase-rest";

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

export async function GET(_request: Request, context: { params: Promise<{ section: string }> }) {
  const { section: raw } = await context.params;
  const section = sectionOf(raw);
  if (!section) return Response.json({ error: "قسم غير موجود" }, { status: 404 });
  try {
    const query = section === "reports" ? "finance_movements?select=*&order=occurred_at.desc" : `${tables[section]}?select=*&order=created_at.desc`;
    const response = await supabaseRest(query);
    if (!response.ok) throw new Error();
    const rows = await response.json() as Array<Record<string, unknown>>;
    return Response.json({ records: rows.map((row) => asRecord(section, row)) });
  } catch { return Response.json({ records: [] }); }
}

export async function POST(request: Request, context: { params: Promise<{ section: string }> }) {
  const { section: raw } = await context.params;
  const section = sectionOf(raw);
  const data = await request.json() as { name?: string; detail?: string; amount?: number };
  if (!section || !data.name) return Response.json({ error: "بيانات غير مكتملة" }, { status: 400 });
  try {
    assertWriteAccess();
    const amount = Math.round(Number(data.amount) || 0);
    const payload: Record<string, unknown> = section === "members" ? { full_name: data.name, plan_name: data.detail || "باقة لياقة شهرية", training_schedule: "3 حصص أسبوعيًا", monthly_fee: amount, membership_status: "نشط" }
      : section === "coaches" ? { full_name: data.name, job_title: data.detail || "كابتن", compensation_type: "راتب شهري", monthly_amount: amount, employment_status: "نشط" }
      : section === "store" ? { name: data.name, description: data.detail || "منتج متجر", stock_quantity: 0, sale_price: amount, cost_price: 0 }
      : section === "assets" ? { name: data.name, description: data.detail || "سجل جديد", asset_type: "مصروف", amount, status: "نشط" }
      : section === "settings" ? { key: data.name, value: data.detail || "", description: "إعداد نادي" }
      : { title: data.name, account_name: data.detail || "إدارة النادي", category: section === "reports" ? "تقرير" : "متفرقات", amount, direction: "in", payment_method: "نقدي" };
    const table = tables[section];
    const response = await supabaseRest(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error();
    const [row] = await response.json() as Array<Record<string, unknown>>;
    return Response.json({ record: asRecord(section, row) }, { status: 201 });
  } catch { return Response.json({ error: "ربط Supabase غير مكتمل. أضف المفتاح السري كمتغير بيئة في الموقع." }, { status: 503 }); }
}
