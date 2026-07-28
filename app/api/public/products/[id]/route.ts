import { supabaseRest } from "@/lib/supabase-rest";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const response = await supabaseRest(`products?select=id,name,description,image_url,stock_quantity,sale_price,active,sku,category,colors,sizes&id=eq.${encodeURIComponent(id)}&active=eq.true&limit=1`);
    if (!response.ok) throw new Error();
    const [product] = await response.json();
    if (!product) return Response.json({ error: "المنتج غير موجود." }, { status: 404 });
    return Response.json({ product });
  } catch { return Response.json({ error: "تعذر تحميل المنتج." }, { status: 503 }); }
}
