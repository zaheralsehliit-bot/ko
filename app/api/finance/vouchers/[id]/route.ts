import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireRole(request,["admin","coach","investor"]); if(auth.response)return auth.response; const {id}=await params;
  try { const response=await supabaseRest(`financial_vouchers?select=*,members(full_name),courses(name),staff(full_name),invoices(invoice_number),finance_accounts!financial_vouchers_source_account_id_fkey(name),finance_attachments(*),expense_responsibility_allocations(*,finance_partners(name))&id=eq.${id}&limit=1`); if(!response.ok)throw new Error(); const [voucher]=await response.json() as Array<{coach_id?:string|null;partner_id?:string|null}>; if(!voucher)return Response.json({error:"Voucher not found."},{status:404}); if(auth.session?.role==="coach"&&voucher.coach_id!==auth.session.staffId)return Response.json({error:"You cannot access this voucher."},{status:403}); return Response.json({voucher}); }
  catch{return Response.json({error:"Finance voucher is unavailable."},{status:503});}
}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireRole(request,["admin"]); if(auth.response)return auth.response; const {id}=await params;
  try {
    assertWriteAccess(); const body=await request.json() as {action?:string;reason?:string};
    if(body.action!=="void" || !body.reason?.trim()) return Response.json({error:"A void reason is required."},{status:400});
    const response=await supabaseRest("rpc/finance_void_voucher",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({p_voucher_id:id,p_reason:body.reason.trim(),p_actor_id:auth.session!.id})});
    if(!response.ok) throw new Error(await response.text());
    return Response.json({reversalVoucherId:await response.json()});
  } catch { return Response.json({error:"Unable to reverse this voucher."},{status:503}); }
}
