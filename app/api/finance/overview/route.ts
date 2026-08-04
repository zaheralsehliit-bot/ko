import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

type Voucher = { id:string; voucher_number:string; voucher_type:string; direction:"income"|"expense"|"transfer"; status:string; amount:number; occurred_at:string; category:string; title:string; course_id?:string|null; coach_id?:string|null; partner_id?:string|null };
const amount = (rows: Voucher[], predicate: (row: Voucher) => boolean) => rows.filter(predicate).reduce((sum,row)=>sum+Number(row.amount||0),0);
const day = (date: Date) => date.toISOString().slice(0,10);

export async function GET(request: Request) {
  const auth = await requireRole(request,["admin","coach","investor"]); if (auth.response) return auth.response;
  const url = new URL(request.url); const to = url.searchParams.get("to") || day(new Date()); const from = url.searchParams.get("from") || `${to.slice(0,8)}01`;
  try {
    let filter = `financial_vouchers?select=id,voucher_number,voucher_type,direction,status,amount,occurred_at,category,title,course_id,coach_id,partner_id&occurred_at=gte.${from}T00:00:00Z&occurred_at=lte.${to}T23:59:59Z&order=occurred_at.desc&limit=500`;
    if (auth.session?.role === "coach") filter += `&coach_id=eq.${auth.session.staffId}`;
    const [voucherResponse,accountResponse,commissionResponse,invoiceResponse,closingResponse] = await Promise.all([
      supabaseRest(filter), supabaseRest("finance_account_balances?select=id,code,name,kind,balance,currency"),
      supabaseRest(`coach_commission_entries?select=accrued_amount,paid_amount,reversed_amount,status,coach_id,course_id,created_at&created_at=gte.${from}T00:00:00Z&created_at=lte.${to}T23:59:59Z${auth.session?.role==="coach"?`&coach_id=eq.${auth.session.staffId}`:""}`),
      supabaseRest(`invoices?select=id,total,status,due_date,issued_at&issued_at=gte.${from}T00:00:00Z&issued_at=lte.${to}T23:59:59Z`),
      supabaseRest("finance_cash_closings?select=id,status,closing_date&status=in.(open,submitted,discrepancy)&order=closing_date.desc")
    ]);
    if (![voucherResponse,accountResponse,commissionResponse,invoiceResponse,closingResponse].every(r=>r.ok)) throw new Error("finance migration missing");
    const vouchers = await voucherResponse.json() as Voucher[]; const accounts = await accountResponse.json() as Array<{id:string;code:string;name:string;kind:string;balance:number;currency:string}>;
    const commissions = await commissionResponse.json() as Array<{accrued_amount:number;paid_amount:number;reversed_amount:number}>;
    const invoices = await invoiceResponse.json() as Array<{total:number;status:string;due_date:string|null}>; const closings = await closingResponse.json() as Array<{id:string;status:string;closing_date:string}>;
    const today = day(new Date()); const income = amount(vouchers,v=>v.direction==="income"&&v.voucher_type!=="refund"&&v.status!=="void"); const refunds = amount(vouchers,v=>v.voucher_type==="refund"&&v.status!=="void");
    const expenses = amount(vouchers,v=>v.direction==="expense"&&v.category!=="coach_commission"&&v.category!=="partner_distribution"&&v.status!=="void");
    const commissionAccrued = commissions.reduce((s,x)=>s+Number(x.accrued_amount||0)-Number(x.reversed_amount||0),0); const commissionPaid=commissions.reduce((s,x)=>s+Number(x.paid_amount||0),0);
    const cashbox=accounts.filter(a=>a.kind==="cashbox").reduce((s,a)=>s+Number(a.balance||0),0); const bank=accounts.filter(a=>a.kind==="bank").reduce((s,a)=>s+Number(a.balance||0),0);
    const top = Object.values(vouchers.filter(v=>v.course_id&&v.direction==="income").reduce<Record<string,{courseId:string;amount:number}>>((all,v)=>{ const entry=all[v.course_id!]??{courseId:v.course_id!,amount:0}; entry.amount+=Number(v.amount); all[v.course_id!]=entry; return all;},{})).sort((a,b)=>b.amount-a.amount).slice(0,5);
    return Response.json({ period:{from,to}, kpis:{todayIncome:amount(vouchers,v=>v.direction==="income"&&v.occurred_at.slice(0,10)===today),todayExpenses:amount(vouchers,v=>v.direction==="expense"&&v.occurred_at.slice(0,10)===today),monthlyGross:income,refunds,operatingExpenses:expenses,coachCommissionsDue:commissionAccrued-commissionPaid,coachCommissionsPaid:commissionPaid,distributableNetProfit:Math.max(0,income-refunds-commissionAccrued-expenses),cashbox,bank,netCashFlow:income-refunds-expenses,unclosedCashSessions:closings.length,outstandingInvoices:invoices.filter(i=>i.status!=="paid"&&i.status!=="void").reduce((s,i)=>s+Number(i.total),0),overdueInvoices:invoices.filter(i=>i.status!=="paid"&&i.due_date&&i.due_date<today).length},accounts,closings,recent:vouchers.slice(0,12),topCourses:top, pendingApprovals:vouchers.filter(v=>v.status==="pending_approval").length });
  } catch { return Response.json({ error:"Finance data is unavailable. Run finance-center.sql after schema.sql."},{status:503}); }
}
