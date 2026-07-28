import { requireRole } from "@/lib/request-auth";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin"]); if (auth.response) return auth.response;
  try { const response = await supabaseRest("profiles?select=*,staff(id,full_name,staff_code),members(id,full_name,member_code)&order=created_at.desc"); if (!response.ok) throw new Error(); return Response.json({ users: await response.json() }); } catch { return Response.json({ error: "تعذر تحميل المستخدمين." }, { status: 503 }); }
}
