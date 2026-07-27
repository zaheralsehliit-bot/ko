import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/request-auth";

export async function GET(request: Request) {
  const session = await getSessionProfile(request);
  if (!session) return NextResponse.json({ error: "انتهت الجلسة أو الحساب غير مفعّل." }, { status: 401 });
  return NextResponse.json({ email: session.email, full_name: session.fullName, role: session.role });
}
