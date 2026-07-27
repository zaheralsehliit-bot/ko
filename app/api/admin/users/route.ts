import { NextResponse } from "next/server";
import { createAuthUser, currentUser } from "@/lib/supabase-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

async function assertAdmin(request: Request) {
  const token = request.headers.get("cookie")?.match(/nadiak_access_token=([^;]+)/)?.[1];
  if (!token) return false;
  const userResponse = await currentUser(token); if (!userResponse.ok) return false;
  const user = await userResponse.json() as { id: string };
  const profileResponse = await supabaseRest(`profiles?select=role,active&id=eq.${user.id}&limit=1`);
  const [profile] = await profileResponse.json() as Array<{ role: string; active: boolean }>;
  return profile?.role === "admin" && profile.active;
}

export async function POST(request: Request) {
  try {
    if (!await assertAdmin(request)) return NextResponse.json({ error: "هذه العملية للإدارة فقط." }, { status: 403 });
    assertWriteAccess();
    const { fullName, email, password, role } = await request.json() as Record<string, string>;
    if (!fullName || !email || !password || !["admin", "coach", "investor", "customer"].includes(role)) return NextResponse.json({ error: "تحقق من جميع الحقول والدور." }, { status: 400 });
    if (password.length < 10) return NextResponse.json({ error: "كلمة المرور يجب أن تكون 10 أحرف على الأقل." }, { status: 400 });
    const authResponse = await createAuthUser(email, password, fullName);
    if (!authResponse.ok) return NextResponse.json({ error: "تعذر إنشاء المستخدم. قد يكون البريد مستخدماً." }, { status: 400 });
    const user = await authResponse.json() as { user: { id: string } };
    const profileLink: Record<string, string> = {};
    if (role === "coach") {
      const staffResponse = await supabaseRest("staff", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ full_name: fullName, job_title: "كوتش", compensation_type: "يحدد من الإدارة", monthly_amount: 0, employment_status: "نشط" }) });
      const [staff] = await staffResponse.json() as Array<{ id: string }>;
      if (!staffResponse.ok || !staff) throw new Error("تعذر إنشاء ملف الكوتش المالي.");
      profileLink.staff_id = staff.id;
    }
    if (role === "customer") {
      const memberResponse = await supabaseRest("members", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ full_name: fullName, plan_name: "لم يحدد بعد", training_schedule: "يحدد لاحقاً", membership_status: "مبدئي", monthly_fee: 0 }) });
      const [member] = await memberResponse.json() as Array<{ id: string }>;
      if (!memberResponse.ok || !member) throw new Error("تعذر إنشاء ملف المتدرب.");
      profileLink.member_id = member.id;
    }
    const profileResponse = await supabaseRest("profiles", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ id: user.user.id, full_name: fullName, role, active: true, ...profileLink }) });
    if (!profileResponse.ok) return NextResponse.json({ error: "تم إنشاء حساب الدخول لكن تعذر تعيين دوره. راجع قاعدة البيانات." }, { status: 500 });
    await supabaseRest("audit_logs", { method: "POST", body: JSON.stringify({ action: "create_user", entity_type: "profile", entity_id: user.user.id, metadata: { role, email } }) });
    return NextResponse.json({ ok: true, id: user.user.id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر إنشاء المستخدم." }, { status: 500 }); }
}
