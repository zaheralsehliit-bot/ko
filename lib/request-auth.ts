import { currentUser } from "./supabase-auth";
import { supabaseRest } from "./supabase-rest";

export type AppRole = "admin" | "coach" | "investor" | "customer";
export type SessionProfile = { id: string; email: string; fullName: string; role: AppRole; staffId: string | null; memberId: string | null };

function accessToken(request: Request) {
  const raw = request.headers.get("cookie")?.match(/(?:^|;\s*)nadiak_access_token=([^;]+)/)?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

export async function getSessionProfile(request: Request): Promise<SessionProfile | null> {
  try {
    const token = accessToken(request);
    if (!token) return null;
    const userResponse = await currentUser(token);
    if (!userResponse.ok) return null;
    const user = await userResponse.json() as { id: string; email?: string };
    const profileResponse = await supabaseRest(`profiles?select=id,full_name,role,staff_id,member_id,active&id=eq.${user.id}&limit=1`);
    if (!profileResponse.ok) return null;
    const [profile] = await profileResponse.json() as Array<{ id: string; full_name: string; role: AppRole; staff_id: string | null; member_id: string | null; active: boolean }>;
    if (!profile?.active || !["admin", "coach", "investor", "customer"].includes(profile.role)) return null;
    return { id: profile.id, email: user.email ?? "", fullName: profile.full_name, role: profile.role, staffId: profile.staff_id, memberId: profile.member_id };
  } catch { return null; }
}

export async function requireRole(request: Request, allowed: AppRole[]) {
  const session = await getSessionProfile(request);
  if (!session) return { session: null, response: Response.json({ error: "سجّل الدخول أولاً." }, { status: 401 }) };
  if (!allowed.includes(session.role)) return { session: null, response: Response.json({ error: "لا تملك صلاحية لهذه العملية." }, { status: 403 }) };
  return { session, response: null };
}
