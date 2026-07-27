import { assertWriteAccess, supabaseRest } from "../../../lib/supabase-rest";

export async function GET() {
  try {
    const response = await supabaseRest("finance_movements?select=*&order=occurred_at.desc&limit=100");
    if (!response.ok) throw new Error();
    const rows = await response.json() as Array<{ id: string; title: string; account_name: string; category: string; amount: number; direction: "in" | "out"; payment_method: string; occurred_at: string }>;
    return Response.json({ movements: rows.map((row) => ({ id: row.id, title: row.title, accountName: row.account_name, category: row.category, amount: row.amount, direction: row.direction, paymentMethod: row.payment_method, createdAt: row.occurred_at })) });
  } catch {
    return Response.json({ movements: [] });
  }
}

export async function POST(request: Request) {
  const data = await request.json() as Partial<{ title: string; accountName: string; category: string; amount: number; direction: "in" | "out"; paymentMethod: string }>;
  if (!data.title || !data.accountName || !data.category || !data.amount || !data.direction) return Response.json({ error: "بيانات الحركة غير مكتملة" }, { status: 400 });
  try {
    assertWriteAccess();
    const response = await supabaseRest("finance_movements", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ title: data.title, account_name: data.accountName, category: data.category, amount: Math.round(data.amount), direction: data.direction, payment_method: data.paymentMethod || "نقدي" }) });
    if (!response.ok) throw new Error(await response.text());
    const [row] = await response.json() as Array<{ id: string }>;
    return Response.json({ movement: { id: row.id } }, { status: 201 });
  } catch {
    return Response.json({ error: "ربط Supabase غير مكتمل. أضف المفتاح السري كمتغير بيئة في الموقع." }, { status: 503 });
  }
}
