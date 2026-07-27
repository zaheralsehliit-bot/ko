import { NextResponse } from "next/server";
export async function POST() { const response = NextResponse.json({ ok: true }); response.headers.set("Set-Cookie", "nadiak_access_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"); return response; }
