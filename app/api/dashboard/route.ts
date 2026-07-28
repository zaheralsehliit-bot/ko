import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "investor"]); if (auth.response) return auth.response;
  try {
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0); const start = month.toISOString();
    const [members, expiring, income, expenses, movements, products, staff, payouts] = await Promise.all([
      supabaseRest("members?select=id&membership_status=eq.%D9%86%D8%B4%D8%B7"),
      supabaseRest(`members?select=id&renewal_date=gte.${new Date().toISOString().slice(0,10)}&renewal_date=lte.${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}`),
      supabaseRest(`finance_movements?select=amount&direction=eq.in&occurred_at=gte.${start}`),
      supabaseRest(`finance_movements?select=amount&direction=eq.out&occurred_at=gte.${start}`),
      supabaseRest("finance_movements?select=id,title,account_name,category,amount,direction,payment_method,occurred_at&order=occurred_at.desc&limit=8"),
      supabaseRest("products?select=id&stock_quantity=lt.10&active=eq.true"),
      supabaseRest("staff?select=id,full_name,monthly_amount"),
      supabaseRest(`coach_payouts?select=staff_id,amount&paid_at=gte.${start}`),
    ]);
    const values = await Promise.all([members, expiring, income, expenses, movements, products, staff, payouts].map(async r => r.ok ? r.json() : []));
    const [memberRows, expiringRows, incomeRows, expenseRows, movementRows, productRows, staffRows, payoutRows] = values as [Array<{id:string}>,Array<{id:string}>,Array<{amount:number}>,Array<{amount:number}>,Array<Record<string,unknown>>,Array<{id:string}>,Array<{id:string;full_name:string;monthly_amount:number}>,Array<{staff_id:string;amount:number}>];
    const sum = (rows: Array<{amount:number}>) => rows.reduce((total, row) => total + Number(row.amount || 0), 0);
    const paidByStaff = new Map<string, number>(); payoutRows.forEach(p => paidByStaff.set(p.staff_id, (paidByStaff.get(p.staff_id) ?? 0) + Number(p.amount)));
    const outstandingCoachPayments = staffRows.reduce((total, coach) => total + Math.max(0, Number(coach.monthly_amount || 0) - (paidByStaff.get(coach.id) ?? 0)), 0);
    return Response.json({ kpis: { activeMembers: memberRows.length, expiringMembers: expiringRows.length, monthlyIncome: sum(incomeRows), monthlyExpenses: sum(expenseRows), netProfit: sum(incomeRows) - sum(expenseRows), outstandingCoachPayments, lowStock: productRows.length }, movements: movementRows });
  } catch { return Response.json({ error: "تعذر تحميل ملخص الإدارة." }, { status: 503 }); }
}
