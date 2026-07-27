import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("cookie")?.match(/nadiak_access_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "غير مسجّل" }, { status: 401 });
    const userResponse = await currentUser(token);
    if (!userResponse.ok) return NextResponse.json({ error: "انتهت الجلسة" }, { status: 401 });
    const user = await userResponse.json() as { id: string; email: string };
    const profileResponse = await supabaseRest(`profiles?select=role,full_name,active&id=eq.${user.id}&limit=1`);
    const [profile] = await profileResponse.json() as Array<{ role: string; full_name: string; active: boolean }>;
    if (!profile?.active) return NextResponse.json({ error: "الحساب غير مفعّل" }, { status: 403 });
    return NextResponse.json({ email: user.email, ...profile });
  } catch { return NextResponse.json({ error: "تعذر التحقق من الجلسة" }, { status: 500 }); }
}
