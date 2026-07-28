import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  try {
    const [coursesResponse, productsResponse, coachesResponse, achievementsResponse, settingsResponse] = await Promise.all([
      supabaseRest("courses?select=id,course_code,name,category,short_description,level,schedule,monthly_price,capacity,cover_image_url,staff(full_name,specialties)&status=eq.%D9%86%D8%B4%D8%B7&order=created_at.desc&limit=6"),
      supabaseRest("products?select=id,name,description,image_url,stock_quantity,sale_price,active&active=eq.true&order=created_at.desc&limit=6"),
      supabaseRest("staff?select=id,full_name,job_title,specialties,avatar_url,employment_status&employment_status=eq.%D9%86%D8%B4%D8%B7&order=created_at.asc&limit=4"),
      supabaseRest("achievements?select=id,title,athlete_name,competition,achieved_at,image_url,description&published=eq.true&order=achieved_at.desc&limit=6"),
      supabaseRest("app_settings?select=key,value"),
    ]);
    if (![coursesResponse, productsResponse, coachesResponse, achievementsResponse, settingsResponse].every(r => r.ok)) throw new Error();
    const [courses, products, coaches, achievements, settings] = await Promise.all([coursesResponse.json(), productsResponse.json(), coachesResponse.json(), achievementsResponse.json(), settingsResponse.json()]);
    return Response.json({ courses, products, coaches, achievements, settings: Object.fromEntries((settings as Array<{ key: string; value: string }>).map(row => [row.key, row.value])) });
  } catch {
    return Response.json({ error: "تعذر تحميل بيانات نادي KO حالياً." }, { status: 503 });
  }
}
