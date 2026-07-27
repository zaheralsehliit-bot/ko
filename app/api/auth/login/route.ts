import { NextResponse } from "next/server";
import { authCookie, signInWithPassword } from "@/lib/supabase-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };
    if (!email || !password) return NextResponse.json({ error: "أدخل البريد وكلمة المرور." }, { status: 400 });
    const login = await signInWithPassword(email, password);
    if (!login.ok) return NextResponse.json({ error: "بيانات الدخول غير صحيحة أو الحساب غير مفعّل." }, { status: 401 });
    const session = await login.json() as { access_token: string; user: { id: string } };
    const profileResponse = await supabaseRest(`profiles?select=role,full_name,active&id=eq.${session.user.id}&limit=1`);
    const [profile] = await profileResponse.json() as Array<{ role: string; full_name: string; active: boolean }>;
    if (!profile?.active) return NextResponse.json({ error: "لا يوجد دور مفعّل لهذا الحساب. راجع الإدارة." }, { status: 403 });
    const response = NextResponse.json({ role: profile.role, fullName: profile.full_name });
    response.headers.set("Set-Cookie", authCookie(session.access_token));
    return response;
  } catch { return NextResponse.json({ error: "تعذر تسجيل الدخول الآن." }, { status: 500 }); }
}
