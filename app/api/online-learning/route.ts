import { audit, isUuid, text } from "@/lib/api-utils";
import { requireRole } from "@/lib/request-auth";
import { assertWriteAccess, supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  try {
    const result = await supabaseRest("online_lessons?select=id,title,description,level,price,video_url,resource_url,lesson_order,staff(full_name,job_title,avatar_url)&active=eq.true&order=lesson_order.asc");
    if (!result.ok) throw new Error();
    return Response.json({ lessons: await result.json() });
  } catch { return Response.json({ error: "تعذر تحميل الدروس الأونلاين." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["customer"]); if (auth.response) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; const lessonId = text(body?.lessonId, 40);
  if (!isUuid(lessonId) || !auth.session?.memberId) return Response.json({ error: "الدرس غير صالح." }, { status: 400 });
  try {
    assertWriteAccess();
    const lessonResult = await supabaseRest(`online_lessons?select=id,price,active&id=eq.${lessonId}&limit=1`);
    const [lesson] = lessonResult.ok ? await lessonResult.json() as Array<{ price: number; active: boolean }> : [];
    if (!lesson?.active) return Response.json({ error: "الدرس غير متاح." }, { status: 404 });
    if (Number(lesson.price) > 0) return Response.json({ error: "هذا الدرس مدفوع؛ أكمل الدفع مع الإدارة أولاً." }, { status: 402 });
    const result = await supabaseRest("online_lesson_enrollments", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify({ lesson_id: lessonId, member_id: auth.session.memberId }) });
    if (!result.ok) throw new Error();
    await audit(auth.session.id, "enroll_online_lesson", "online_lessons", lessonId, { memberId: auth.session.memberId });
    return Response.json({ ok: true }, { status: 201 });
  } catch { return Response.json({ error: "تعذر تسجيلك في الدرس." }, { status: 503 }); }
}
