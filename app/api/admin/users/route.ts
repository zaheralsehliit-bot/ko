import { NextResponse } from "next/server";
import { createAuthUser, deleteAuthUser } from "@/lib/supabase-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";
import { requireRole } from "@/lib/request-auth";

const roles = ["admin", "coach", "investor", "customer"] as const;
type Role = typeof roles[number];

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]);
  if (auth.response) return auth.response;
  let userId = ""; let staffId = ""; let memberId = "";
  try {
    assertWriteAccess();
    const body = await request.json() as Record<string, unknown>;
    const fullName = typeof body.fullName === "string" ? body.fullName.trim().replace(/\s+/g, " ").slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" && roles.includes(body.role as Role) ? body.role as Role : null;
    if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !role) return NextResponse.json({ error: "تحقق من الاسم والبريد والدور." }, { status: 400 });
    if (password.length < 10) return NextResponse.json({ error: "كلمة المرور يجب أن تكون 10 أحرف على الأقل." }, { status: 400 });
    const authResponse = await createAuthUser(email, password, fullName);
    if (!authResponse.ok) return NextResponse.json({ error: "تعذر إنشاء المستخدم. قد يكون البريد مستخدماً." }, { status: 400 });
    const created = await authResponse.json() as { user: { id: string } }; userId = created.user.id;
    const profileLink: Record<string, string> = {};
    if (role === "coach") {
      const response = await supabaseRest("staff", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ full_name: fullName, job_title: "كوتش", compensation_type: "يحدد من الإدارة", monthly_amount: 0, employment_status: "نشط" }) });
      if (!response.ok) throw new Error("تعذر إنشاء ملف الكوتش المالي.");
      const [staff] = await response.json() as Array<{ id: string }>; if (!staff) throw new Error("تعذر إنشاء ملف الكوتش المالي.");
      staffId = staff.id; profileLink.staff_id = staff.id;
    }
    if (role === "customer") {
      const response = await supabaseRest("members", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ full_name: fullName, plan_name: "لم يحدد بعد", training_schedule: "يحدد لاحقاً", membership_status: "مبدئي", monthly_fee: 0 }) });
      if (!response.ok) throw new Error("تعذر إنشاء ملف المتدرب.");
      const [member] = await response.json() as Array<{ id: string }>; if (!member) throw new Error("تعذر إنشاء ملف المتدرب.");
      memberId = member.id; profileLink.member_id = member.id;
    }
    const profileResponse = await supabaseRest("profiles", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ id: userId, full_name: fullName, role, active: true, ...profileLink }) });
    if (!profileResponse.ok) throw new Error("تعذر تعيين دور المستخدم.");
    await supabaseRest("audit_logs", { method: "POST", body: JSON.stringify({ actor_id: auth.session?.id, action: "create_user", entity_type: "profile", entity_id: userId, metadata: { role, email } }) });
    return NextResponse.json({ ok: true, id: userId }, { status: 201 });
  } catch (error) {
    if (staffId) await supabaseRest(`staff?id=eq.${staffId}`, { method: "DELETE" }).catch(() => undefined);
    if (memberId) await supabaseRest(`members?id=eq.${memberId}`, { method: "DELETE" }).catch(() => undefined);
    if (userId) await deleteAuthUser(userId).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر إنشاء المستخدم." }, { status: 500 });
  }
}
