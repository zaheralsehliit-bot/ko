"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setError(data.error || "تعذر الدخول.");
    router.push(data.role === "customer" ? "/shop" : `/portal/${data.role}`);
  }
  return <main dir="rtl" className="login-page"><section className="login-hero"><div className="brand"><span className="brand-mark">ن</span>ناديك<span className="brand-dot">.</span></div><p className="eyebrow">إدارة ناديك بثقة</p><h1>كل شخص يرى ما يخصّه.<br />وكل رقم له أثر موثّق.</h1><ul><li>دخول مستقل وآمن للإدارة والكوتش والمستثمر</li><li>متجر بسيط وواضح للمتدربين والعملاء</li><li>سجل مالي وفواتير قابلة للتدقيق</li></ul><Link href="/shop">تصفح المتجر ←</Link></section><section className="login-card"><div><p className="eyebrow">تسجيل الدخول</p><h2>أهلاً بعودتك</h2><p>أدخل حسابك للوصول إلى بوابتك الخاصة.</p></div><form onSubmit={submit}><label>البريد الإلكتروني<input name="email" type="email" autoComplete="email" placeholder="name@club.com" required /></label><label>كلمة المرور<input name="password" type="password" autoComplete="current-password" placeholder="••••••••••" required /></label>{error && <p className="form-error">{error}</p>}<button className="primary-button wide" disabled={loading}>{loading ? "جارِ التحقق…" : "دخول آمن"}</button></form><small>لإنشاء حساب جديد، تواصل مع إدارة النادي.</small></section></main>;
}
