import { audit, text } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "coach"]); if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams; const q = text(params.get("q")); const status = text(params.get("status"));
  try {
    const filters = ["select=id,member_code,full_name,phone,whatsapp,membership_status,renewal_date,monthly_fee,assigned_coach_id,avatar_url,staff:staff!members_assigned_coach_id_fkey(full_name)", "order=created_at.desc", "limit=200"];
    if (q) filters.push(`or=(full_name.ilike.*${encodeURIComponent(q)}*,member_code.ilike.*${encodeURIComponent(q)}*,phone.ilike.*${encodeURIComponent(q)}*)`);
    if (status) filters.push(`membership_status=eq.${encodeURIComponent(status)}`);
    if (auth.session?.role === "coach") filters.push(`assigned_coach_id=eq.${auth.session.staffId}`);
    const [membersResponse, subscriptionsResponse] = await Promise.all([supabaseRest(`members?${filters.join("&")}`), supabaseRest("subscriptions?select=member_id,course_id,end_date,status,amount,courses(id,name,monthly_price)")]);
    if (!membersResponse.ok || !subscriptionsResponse.ok) throw new Error();
    const members = await membersResponse.json() as Array<Record<string, unknown>>;
    const subscriptions = await subscriptionsResponse.json() as Array<{ member_id: string; end_date: string; status: string; amount: number; courses: { id: string; name: string; monthly_price: number } | null }>;
    const latest = new Map<string, typeof subscriptions[number]>(); subscriptions.filter(s => s.status === "نشط" || s.status === "بانتظار الدفع").sort((a,b) => b.end_date.localeCompare(a.end_date)).forEach(s => { if (!latest.has(s.member_id)) latest.set(s.member_id, s); });
    return Response.json({ members: members.map(member => ({ ...member, subscription: latest.get(String(member.id)) ?? null })) });
  } catch { return Response.json({ error: "تعذر تحميل المتدربين." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; const fullName = text(body?.full_name); const phone = text(body?.phone, 30);
  if (!fullName) return Response.json({ error: "اسم المتدرب مطلوب." }, { status: 400 });
  try {
    assertWriteAccess();
    const memberCode = `MEM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const payload = { full_name: fullName, member_code: memberCode, phone: phone || null, whatsapp: text(body?.whatsapp,30) || phone || null, gender: text(body?.gender,20) || null, membership_status: "مبدئي", plan_name: "لم يحدد بعد", training_schedule: "يحدد لاحقاً", monthly_fee: 0, assigned_coach_id: text(body?.assigned_coach_id,40) || null, goals: text(body?.goals,500) || null };
    const response = await supabaseRest("members", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error();
    const [member] = await response.json() as Array<{ id: string }>; await audit(auth.session?.id, "create_member", "members", member?.id, { memberCode });
    return Response.json({ member }, { status: 201 });
  } catch { return Response.json({ error: "تعذر إضافة المتدرب." }, { status: 503 }); }
}
