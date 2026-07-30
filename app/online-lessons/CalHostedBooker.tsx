"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const calLink = process.env.NEXT_PUBLIC_CAL_BOOKING_URL?.trim();

export default function CalHostedBooker() {
  const [loaded, setLoaded] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Damascus");
  const source = useMemo(() => {
    if (!calLink) return null;
    const url = new URL(calLink);
    url.searchParams.set("embed", "1");
    url.searchParams.set("theme", "light");
    url.searchParams.set("lang", "ar");
    url.searchParams.set("timezone", timezone);
    return url.toString();
  }, [timezone]);

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timer = window.setTimeout(() => { if (detected) setTimezone(detected); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <main className="ko-site cal-page" dir="rtl">
    <header className="ko-nav"><Link href="/" className="ko-brand"><Image src="/ko-logo.png" alt="KO Fighters" width={48} height={48}/><span>KO<span>•</span></span></Link><nav><Link href="/about">من نحن</Link><Link href="/courses">الدورات</Link><Link href="/shop">المتجر</Link><Link href="/contact">تواصل معنا</Link></nav><Link className="ko-login" href="/login">دخول النادي</Link></header>
    <section className="cal-booking-shell">
      <aside className="cal-brand-panel"><p className="ko-kicker">KO ONLINE SESSION</p><h1>وقتك للتطور<br/><em>نحجزه باحتراف.</em></h1><p>اختر الموعد المناسب مع الكوتش. Cal.com يتحقق مباشرةً من توافر الكوتش وتقويم Google، ثم يرسل تأكيد الموعد ورابط اللقاء.</p><dl><div><dt>جلسات مباشرة</dt><dd>تدريب فردي واستشارات</dd></div><div><dt>توقيتك أنت</dt><dd>{timezone}</dd></div><div><dt>لقاء آمن</dt><dd>Google Meet عند تفعيله</dd></div></dl></aside>
      <section className="cal-frame-panel" aria-live="polite"><div className="cal-frame-heading"><div><p>الحجز الإلكتروني</p><h2>اختر التاريخ والوقت</h2></div><label>المنطقة الزمنية<select value={timezone} onChange={event => setTimezone(event.target.value)}><option value="Asia/Damascus">دمشق (GMT+3)</option><option value="Asia/Riyadh">الرياض (GMT+3)</option><option value="Europe/Istanbul">إسطنبول</option><option value="Europe/London">لندن</option></select></label></div>{!source ? <div className="cal-config-empty"><h2>الحجز الإلكتروني قيد الإعداد</h2><p>يجب إضافة رابط Event Type المستضاف من Cal.com في متغير البيئة <code>NEXT_PUBLIC_CAL_BOOKING_URL</code> قبل استقبال الحجوزات.</p><Link href="/contact">تواصل مع النادي</Link></div> : <div className="cal-embed-wrap">{!loaded && <div className="cal-loading">جارٍ تحميل المواعيد المتاحة…</div>}<iframe title="حجز جلسة KO Fighters" src={source} onLoad={() => setLoaded(true)} className={loaded ? "loaded" : ""} allow="camera; microphone; fullscreen" /></div>}</section>
    </section>
  </main>;
}
