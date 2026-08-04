import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  const auth=await requireRole(request,["admin","coach","investor"]); if(auth.response)return auth.response;
  const url=new URL(request.url); const search=url.searchParams.get("q")?.trim(); const status=url.searchParams.get("status"); const type=url.searchParams.get("type");
  let query="financial_vouchers?select=id,voucher_number,voucher_type,direction,status,amount,currency,occurred_at,title,category,course_id,coach_id,partner_id&order=occurred_at.desc&limit=200";
  if(auth.session?.role==="coach") query+=`&coach_id=eq.${auth.session.staffId}`;
  if(status) query+=`&status=eq.${encodeURIComponent(status)}`; if(type) query+=`&voucher_type=eq.${encodeURIComponent(type)}`; if(search) query+=`&or=(voucher_number.ilike.*${encodeURIComponent(search)}*,title.ilike.*${encodeURIComponent(search)}*)`;
  try { const response=await supabaseRest(query); if(!response.ok)throw new Error(); return Response.json({transactions:await response.json()}); }
  catch{return Response.json({error:"Finance transactions are unavailable."},{status:503});}
}

type CreateVoucher = { voucherType?: string; direction?: string; amount?: number; title?: string; category?: string; paymentMethod?: string; sourceAccountId?: string; destinationAccountId?: string; sourceAccountCode?: string; destinationAccountCode?: string; occurredAt?: string; notes?: string; reason?: string; status?: string };
const allowedTypes = new Set(["income","expense","payment","transfer","distribution","refund","adjustment"]);
const allowedDirections = new Set(["income","expense","transfer"]);

export async function POST(request: Request) {
  const auth = await requireRole(request,["admin"]); if (auth.response) return auth.response;
  try {
    assertWriteAccess();
    const body = await request.json() as CreateVoucher;
    const amount = Number(body.amount);
    const voucherType = body.voucherType || (body.direction === "income" ? "income" : body.direction === "transfer" ? "transfer" : "expense");
    const direction = body.direction || "expense";
    if (!Number.isFinite(amount) || amount <= 0 || !body.title?.trim() || !allowedTypes.has(voucherType) || !allowedDirections.has(direction)) return Response.json({ error: "Invalid voucher data." }, { status: 400 });
    let sourceAccountId = body.sourceAccountId; let destinationAccountId = body.destinationAccountId;
    const codes = [body.sourceAccountCode,body.destinationAccountCode].filter(Boolean) as string[];
    if (codes.length) { const accountResponse = await supabaseRest(`finance_accounts?select=id,code&code=in.(${codes.map(encodeURIComponent).join(",")})`); if (!accountResponse.ok) throw new Error("accounts unavailable"); const accounts = await accountResponse.json() as Array<{id:string;code:string}>; sourceAccountId ||= accounts.find(a=>a.code===body.sourceAccountCode)?.id; destinationAccountId ||= accounts.find(a=>a.code===body.destinationAccountCode)?.id; }
    if (direction === "transfer" && (!sourceAccountId || !destinationAccountId || sourceAccountId === destinationAccountId)) return Response.json({ error: "A transfer needs two different accounts." }, { status: 400 });
    if (direction === "income" && !destinationAccountId) return Response.json({ error: "An income voucher needs a destination account." }, { status: 400 });
    if (direction === "expense" && !sourceAccountId) return Response.json({ error: "An expense voucher needs a source account." }, { status: 400 });
    const idempotencyKey = request.headers.get("Idempotency-Key") || crypto.randomUUID();
    const response = await supabaseRest("financial_vouchers", { method: "POST", headers: { Prefer: "return=representation,resolution=merge-duplicates" }, body: JSON.stringify({ voucher_type:voucherType, direction, status: body.status === "pending_approval" ? "pending_approval" : "approved", amount, title:body.title.trim(), category:body.category?.trim() || "other", payment_method:body.paymentMethod?.trim() || null, source_account_id:sourceAccountId || null, destination_account_id:destinationAccountId || null, occurred_at:body.occurredAt || new Date().toISOString(), notes:body.notes?.trim() || null, reason:body.reason?.trim() || null, idempotency_key:idempotencyKey, created_by:auth.session!.id, approved_by:auth.session!.id, approved_at:new Date().toISOString() }) });
    if (!response.ok) throw new Error(await response.text());
    const [voucher] = await response.json();
    return Response.json({ voucher }, { status: 201 });
  } catch { return Response.json({ error: "Unable to create the financial voucher." }, { status: 503 }); }
}
