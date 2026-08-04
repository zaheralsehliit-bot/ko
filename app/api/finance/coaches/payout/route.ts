import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  const auth = await requireRole(request,["admin"]); if (auth.response) return auth.response;
  try {
    assertWriteAccess();
    const body = await request.json() as { coachId?: string; amount?: number; sourceAccountId?: string; method?: string; note?: string; idempotencyKey?: string };
    const amount = Number(body.amount);
    if (!body.coachId || !body.sourceAccountId || !Number.isFinite(amount) || amount <= 0) return Response.json({ error:"Coach, source account, and positive amount are required." },{status:400});
    const response = await supabaseRest("rpc/finance_create_coach_payout", { method:"POST", body:JSON.stringify({ p_coach_id:body.coachId, p_amount:amount, p_source_account_id:body.sourceAccountId, p_method:body.method || "cash", p_note:body.note || null, p_idempotency_key:body.idempotencyKey || crypto.randomUUID(), p_actor_id:auth.session!.id }) });
    if (!response.ok) throw new Error(await response.text());
    return Response.json({ payoutId:await response.json() },{status:201});
  } catch { return Response.json({ error:"Unable to post the coach payout." },{status:503}); }
}
