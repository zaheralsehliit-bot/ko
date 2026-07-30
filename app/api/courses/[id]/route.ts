import { isUuid } from "@/lib/api-utils";
import { audit, amount, text } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; if (!isUuid(id)) return Response.json({ error: "معرّف الدورة غير صالح." }, { status: 400 });
  const auth = await requireRole(request, ["admin", "coach", "customer"]); if (auth.response) return auth.response;
  try {
    const courseResponse = await supabaseRest(`courses?select=*,staff(id,full_name,staff_code,phone,specialties)&id=eq.${id}&limit=1`); if (!courseResponse.ok) throw new Error(); const [course] = await courseResponse.json() as Array<Record<string,unknown>>; if (!course) return Response.json({ error: "الدورة غير موجودة." }, { status: 404 });
    if (auth.session?.role === "coach" && course.coach_id !== auth.session.staffId) return Response.json({ error: "لا تملك صلاحية هذه الدورة." }, { status: 403 });
    const [sessions,subscriptions,attendance] = await Promise.all([supabaseRest(`course_sessions?select=*&course_id=eq.${id}&order=day_of_week.asc,start_time.asc`),supabaseRest(`subscriptions?select=*,members(id,member_code,full_name,phone,avatar_url)&course_id=eq.${id}&order=end_date.desc`),supabaseRest(`attendance?select=id,status,attended_at,member_id&course_id=eq.${id}&order=attended_at.desc&limit=300`)]);
    const parse = async (response: Response) => response.ok ? response.json() : []; const [sessionRows,subscriptionRows,attendanceRows] = await Promise.all([sessions,subscriptions,attendance].map(parse));
    const revenue = subscriptionRows.filter((s: {status:string}) => s.status === "نشط").reduce((sum: number,s: {amount:number}) => sum + Number(s.amount),0);
    return Response.json({ course, sessions: sessionRows, subscriptions: subscriptionRows, attendance: attendanceRows, revenue });
  } catch { return Response.json({ error: "تعذر تحميل تفاصيل الدورة." }, { status: 503 }); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin"]); if (auth.response) return auth.response;
  const { id } = await context.params; if (!isUuid(id)) return Response.json({ error: "معرّف الدورة غير صالح." }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const payload: Record<string, unknown> = {};
  const fields = ["name", "category", "short_description", "full_description", "level", "schedule", "status", "cover_image_url"] as const;
  for (const field of fields) { const value = text(body?.[field], field === "full_description" ? 4000 : 500); if (value) payload[field] = value; }
  for (const field of ["monthly_price", "capacity", "duration_days", "sessions_per_week"] as const) { if (body?.[field] !== undefined) { const value = amount(body[field], field === "monthly_price"); if (value === null || (field !== "monthly_price" && value < 1)) return Response.json({ error: "قيمة الدورة غير صالحة." }, { status: 400 }); payload[field] = value; } }
  if (!Object.keys(payload).length) return Response.json({ error: "لا توجد تعديلات للحفظ." }, { status: 400 });
  try { assertWriteAccess(); const result = await supabaseRest(`courses?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }); if (!result.ok) throw new Error(); const [course] = await result.json(); if (!course) return Response.json({ error: "الدورة غير موجودة." }, { status: 404 }); await audit(auth.session?.id, "update_course", "courses", id, payload); return Response.json({ course }); } catch { return Response.json({ error: "تعذر حفظ تعديلات الدورة." }, { status: 503 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(request, ["admin"]); if (auth.response) return auth.response;
  const { id } = await context.params; if (!isUuid(id)) return Response.json({ error: "معرّف الدورة غير صالح." }, { status: 400 });
  try { assertWriteAccess(); const result = await supabaseRest(`courses?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "مؤرشف" }) }); if (!result.ok) throw new Error(); const [course] = await result.json(); if (!course) return Response.json({ error: "الدورة غير موجودة." }, { status: 404 }); await audit(auth.session?.id, "archive_course", "courses", id); return Response.json({ ok: true }); } catch { return Response.json({ error: "تعذر أرشفة الدورة." }, { status: 503 }); }
}
