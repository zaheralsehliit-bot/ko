import { desc } from "drizzle-orm";
import { ensureFinanceSchema, getDb } from "../../../db";
import { financeMovements } from "../../../db/schema";

export async function GET() {
  try {
    await ensureFinanceSchema();
    const movements = await getDb().select().from(financeMovements).orderBy(desc(financeMovements.id)).limit(100);
    return Response.json({ movements });
  } catch (error) {
    return Response.json({ error: "تعذر تحميل الحركات. تأكد من تفعيل قاعدة البيانات." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const data = await request.json() as Partial<{ title: string; accountName: string; category: string; amount: number; direction: "in" | "out"; paymentMethod: string }>;
  if (!data.title || !data.accountName || !data.category || !data.amount || !data.direction || !["in", "out"].includes(data.direction)) {
    return Response.json({ error: "بيانات الحركة غير مكتملة" }, { status: 400 });
  }
  try {
    await ensureFinanceSchema();
    const [movement] = await getDb().insert(financeMovements).values({ title: data.title, accountName: data.accountName, category: data.category, amount: Math.round(data.amount), direction: data.direction, paymentMethod: data.paymentMethod || "نقدي" }).returning();
    return Response.json({ movement }, { status: 201 });
  } catch {
    return Response.json({ error: "تعذر حفظ الحركة. تأكد من تفعيل قاعدة البيانات." }, { status: 500 });
  }
}
