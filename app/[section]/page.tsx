"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const sections = {
  members: { title: "المتدربون", subtitle: "ملفات المتدربين، الاشتراكات، الدورات والحضور", icon: "♙" },
  finance: { title: "الحسابات والفواتير", subtitle: "دفتر القيود، الفواتير، أرصدة الحسابات والمدفوعات", icon: "◫" },
  coaches: { title: "الكباتن والموظفون", subtitle: "العقود، الجداول، المستحقات وسجل السحوبات", icon: "♟" },
  store: { title: "المتجر والمخزون", subtitle: "المنتجات، الكميات، البيع، الأرباح وتقاسم العوائد", icon: "▣" },
  assets: { title: "الأصول والمصروفات", subtitle: "إيجارات النادي، المعدات، الموردون والفواتير التشغيلية", icon: "◇" },
  reports: { title: "تقارير المستثمر", subtitle: "مؤشرات الربح، التدفقات النقدية وحصة كل طرف", icon: "◔" },
  settings: { title: "إعدادات النادي", subtitle: "بيانات النادي، طرق الدفع والصلاحيات", icon: "⚙" },
} as const;

type SectionKey = keyof typeof sections;
type RecordItem = { id: number | string; name: string; detail: string; status: string; amount?: number };
const arabicMoney = (value: number) => `${new Intl.NumberFormat("ar-SY").format(value)} ل.س`;

export default function DetailPage() {
  const params = useParams<{ section: string }>();
  const section = (params.section in sections ? params.section : "members") as SectionKey;
  const copy = sections[section];
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RecordItem[]>(() => initialRecords(section));

  const visibleRecords = useMemo(() => records.filter((record) => `${record.name} ${record.detail}`.includes(query)), [records, query]);

  useEffect(() => {
    setRecords(initialRecords(section));
    setQuery("");
    fetch(`/api/records/${section}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.records?.length) setRecords(data.records); })
      .catch(() => undefined);
  }, [section]);

  async function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "سجل جديد");
    const detail = String(form.get("detail") || defaultDetail(section));
    const amount = Number(form.get("amount")) || undefined;
    try {
      const response = await fetch(`/api/records/${section}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, detail, amount }) });
      if (!response.ok) throw new Error("save failed");
      const { record } = await response.json();
      setRecords((current) => [record, ...current]);
      setModal(false);
      setNotice(`تمت إضافة ${name} وحفظها في قاعدة البيانات.`);
    } catch {
      setNotice("يتطلب الحفظ تفعيل Supabase وإضافة مفتاح الخادم السري.");
    }
  }

  return <main dir="rtl" className="app-shell detail-shell">
    <aside className="sidebar">
      <Link className="brand" href="/"><span className="brand-mark">ن</span><span>ناديك<span className="brand-dot">.</span></span></Link>
      <div className="club-switcher"><span className="club-icon">⌁</span><div><b>نادي القوة</b><small>الفرع الرئيسي</small></div><span className="chevron">⌄</span></div>
      <nav aria-label="التنقل الرئيسي">
        <Nav href="/" icon="▦" label="نظرة عامة" />
        <Nav href="/members" icon="♙" label="المتدربون" active={section === "members"} badge="128" />
        <Nav href="/finance" icon="◫" label="الحسابات والفواتير" active={section === "finance"} />
        <Nav href="/coaches" icon="♟" label="الكباتن والموظفون" active={section === "coaches"} />
        <Nav href="/store" icon="▣" label="المتجر والمخزون" active={section === "store"} />
        <Nav href="/assets" icon="◇" label="الأصول والمصروفات" active={section === "assets"} />
        <Nav href="/reports" icon="◔" label="تقارير المستثمر" active={section === "reports"} />
      </nav>
      <div className="sidebar-bottom"><Nav href="/settings" icon="⚙" label="الإعدادات" active={section === "settings"} /><div className="profile"><span className="avatar owner">ز</span><div><b>زاهر السهلي</b><small>المدير</small></div><span>⌄</span></div></div>
    </aside>

    <section className="workspace"><header className="topbar"><button className="circle-button" aria-label="الإشعارات">♧<i /></button><div className="date-chip">27 يوليو 2026 <span>⌄</span></div></header><div className="content detail-content">
      <div className="breadcrumb"><Link href="/">نظرة عامة</Link><span>‹</span><b>{copy.title}</b></div>
      <section className="page-heading detail-heading"><div><p className="eyebrow">{copy.icon} إدارة النادي</p><h1>{copy.title}</h1><p className="subhead">{copy.subtitle}</p></div><div className="header-actions"><button className="secondary-button" onClick={() => setNotice("تم إعداد ملف PDF للطباعة.")}>⇩ تصدير التقرير</button><button className="primary-button" onClick={() => setModal(true)}>＋ {actionLabel(section)}</button></div></section>
      {notice && <div className="notice" role="status">✓ {notice}<button onClick={() => setNotice("")}>×</button></div>}
      <SectionSummary section={section} />
      {section === "finance" && <FinanceActions setNotice={setNotice} />}
      {section === "coaches" && <CoachDetail setNotice={setNotice} />}
      {section === "store" && <StoreDetail setNotice={setNotice} />}
      {section === "assets" && <AssetDetail setNotice={setNotice} />}
      {section === "reports" && <InvestorDetail setNotice={setNotice} />}
      {section === "settings" && <SettingsDetail setNotice={setNotice} />}
      <article className="panel detail-table-panel"><div className="panel-heading"><div><h2>{tableTitle(section)}</h2><p>اختر أي سجل لمراجعة تفاصيله وإجراء العملية المناسبة.</p></div><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث سريع" /></label></div><div className="detail-table"><div className="detail-table-head"><span>السجل</span><span>التفاصيل</span><span>الحالة</span><span>القيمة</span><span /></div>{visibleRecords.map((record) => <div className="detail-table-row" key={record.id}><span><b>{record.name}</b><small>رقم #{String(record.id).slice(-5)}</small></span><span>{record.detail}</span><span><i className="status-dot" />{record.status}</span><strong>{record.amount ? arabicMoney(record.amount) : "—"}</strong><button onClick={() => setNotice(`تم فتح ملف ${record.name} للمراجعة.`)}>عرض التفاصيل ‹</button></div>)}{visibleRecords.length === 0 && <p className="empty-state">لا توجد نتائج مطابقة للبحث.</p>}</div></article>
    </div></section>
    {modal && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setModal(false)}>×</button><form onSubmit={addRecord}><p className="eyebrow">{copy.title}</p><h2>{actionLabel(section)}</h2><label>{fieldLabel(section)}<input name="name" required placeholder={fieldPlaceholder(section)} /></label><label>تفاصيل إضافية<input name="detail" placeholder={defaultDetail(section)} /></label>{section !== "settings" && <label>القيمة / الراتب / الاشتراك<input name="amount" type="number" min="0" placeholder="0" /></label>}<button className="primary-button wide" type="submit">حفظ وتحديث السجل</button></form></section></div>}
  </main>;
}

function Nav({ href, icon, label, active, badge }: { href: string; icon: string; label: string; active?: boolean; badge?: string }) { return <Link className={`nav-item ${active ? "active" : ""}`} href={href}><span>{icon}</span>{label}{badge && <em>{badge}</em>}</Link>; }

function SectionSummary({ section }: { section: SectionKey }) {
  const data: Record<SectionKey, Array<[string, string, string]>> = {
    members: [["إجمالي المتدربين", "١٢٨", "11 اشتراكًا ينتهي هذا الأسبوع"], ["اشتراكات هذا الشهر", "٤٬٠٥٠٬٠٠٠", "دخل متكرر"], ["نسبة الحضور", "٨٦٪", "معدل ممتاز"]],
    finance: [["الرصيد المتاح", "٢٬٨٥٠٬٠٠٠", "الصندوق والبنك"], ["فواتير معلقة", "٣", "بقيمة ٤٢٠٬٠٠٠"], ["صافي الربح", "٢٬٥٢٠٬٠٠٠", "هذا الشهر"]],
    coaches: [["الكباتن النشطون", "٨", "6 عقود شهرية"], ["مستحقات معلقة", "٧٤٠٬٠٠٠", "قابلة للسحب"], ["الموظفون", "٥", "رواتب شهرية"]],
    store: [["قيمة المخزون", "١٬٤٥٠٬٠٠٠", "64 صنفًا"], ["مبيعات الشهر", "١٬١٢٦٬٠٠٠", "86 فاتورة بيع"], ["ربح المتجر", "٣٢٢٬٠٠٠", "هامش ٢٨٪"]],
    assets: [["قيمة الأصول", "١٨٬٥٠٠٬٠٠٠", "معدات وأجهزة"], ["مصروفات الشهر", "٢٬٣٣٠٬٠٠٠", "تشغيل ورواتب"], ["فواتير مستحقة", "٣", "تحتاج دفعًا"]],
    reports: [["صافي ربح الشهر", "٢٬٥٢٠٬٠٠٠", "بعد كل المصروفات"], ["حصة المستثمر", "١٬٢٦٠٬٠٠٠", "٥٠٪ من الربح"], ["معدل النمو", "١٩٫٨٪", "مقارنة بالشهر الماضي"]],
    settings: [["الفروع", "١", "الفرع الرئيسي"], ["طرق الدفع", "٣", "نقدي وتحويل ومحفظة"], ["المستخدمون", "٧", "حسب الصلاحيات"]],
  };
  return <section className="detail-kpis">{data[section].map(([label, value, detail], index) => <article className="metric-card" key={label}><div className={`metric-icon ${["purple", "green", "amber"][index]}`}>{["◈", "↗", "◉"][index]}</div><div className="metric-label"><span>{label}</span><small className="positive">محدث الآن</small></div><strong>{value} {value.includes("٬") && <small>ل.س</small>}</strong><p>{detail}</p></article>)}</section>;
}

function FinanceActions({ setNotice }: { setNotice: (value: string) => void }) { return <section className="detail-two-columns"><article className="panel"><div className="panel-heading"><div><h2>حالة الفواتير</h2><p>تابع التحصيل والاستحقاقات دون تأخير.</p></div></div><div className="invoice-cards"><span><b>٢٤</b><small>مدفوعة</small></span><span><b className="orange-text">٣</b><small>معلقة</small></span><span><b>٨</b><small>هذا الأسبوع</small></span></div><button className="secondary-button wide" onClick={() => setNotice("تم إرسال تذكير الدفع للفواتير المعلقة.")}>إرسال تذكير بالفواتير المعلقة</button></article><article className="panel"><div className="panel-heading"><div><h2>إجراء سريع</h2><p>تسجيل قبض أو سحب مرتبط بحساب محدد.</p></div></div><div className="quick-actions"><button onClick={() => setNotice("تم فتح نموذج قبض اشتراك جديد.")}>＋ قبض اشتراك</button><button onClick={() => setNotice("تم فتح نموذج سحب مستحقات كابتن.")}>＋ سحب مستحق</button><button onClick={() => setNotice("تم فتح نموذج تسجيل مصروف تشغيلي.")}>＋ مصروف تشغيلي</button></div></article></section>; }
function CoachDetail({ setNotice }: { setNotice: (value: string) => void }) { return <section className="detail-two-columns"><article className="panel coach-highlight"><div className="panel-heading"><div><h2>ملف الكابتن فهد الأبطح</h2><p>نسبة شهرية وجلسات تدريب جماعي.</p></div><span className="avatar violet">فأ</span></div><div className="coach-money"><span>استحقاق الشهر <b>٥٠٠٬٠٠٠ ل.س</b></span><span>المسحوب <b>٣٠٠٬٠٠٠ ل.س</b></span><strong>المتبقي: ٢٠٠٬٠٠٠ ل.س</strong></div><button className="primary-button wide" onClick={() => setNotice("تم تسجيل طلب سحب ٢٠٠٬٠٠٠ ل.س للكابتن فهد.")}>تسجيل سحب مستحقات</button></article><article className="panel"><div className="panel-heading"><div><h2>جدول العمل اليوم</h2><p>التزام كل كابتن بالحصص.</p></div></div><div className="mini-list"><span><b>06:00 م</b> قوة وتحمل — فهد الأبطح <i>14 متدرب</i></span><span><b>07:30 م</b> لياقة نسائية — لينا حمود <i>11 متدرب</i></span><span><b>09:00 م</b> تدريب شخصي — عمر فواز <i>1 متدرب</i></span></div></article></section>; }
function StoreDetail({ setNotice }: { setNotice: (value: string) => void }) { return <section className="detail-two-columns"><article className="panel"><div className="panel-heading"><div><h2>تنبيه مخزون</h2><p>منتجات وصلت إلى حد إعادة الطلب.</p></div></div><div className="mini-list"><span><b>حزام رفع الأثقال</b> 9 قطع متبقية <i className="orange-text">منخفض</i></span><span><b>قفازات تدريب</b> 17 قطعة متبقية <i>جيد</i></span></div><button className="secondary-button wide" onClick={() => setNotice("تم إنشاء مسودة طلب شراء للمورد.")}>إنشاء طلب شراء</button></article><article className="panel"><div className="panel-heading"><div><h2>بيع سريع</h2><p>سجل بيعًا واربطه بحساب العميل.</p></div></div><button className="primary-button wide" onClick={() => setNotice("تم فتح فاتورة بيع جديدة للمتجر.")}>＋ إنشاء فاتورة بيع</button><p className="account-note">يُحتسب الربح تلقائيًا ويظهر توزيع العائد بين الكابتن والمستثمر والإدارة حسب إعداد المنتج.</p></article></section>; }
function AssetDetail({ setNotice }: { setNotice: (value: string) => void }) { return <section className="detail-two-columns"><article className="panel"><div className="panel-heading"><div><h2>الالتزامات القادمة</h2><p>دفعات يجب تسديدها قريبًا.</p></div></div><div className="mini-list"><span><b>إيجار فرع المزة</b> يستحق 01 أغسطس <i>٦٥٠٬٠٠٠ ل.س</i></span><span><b>فاتورة الكهرباء</b> يستحق 03 أغسطس <i>١٢٠٬٠٠٠ ل.س</i></span></div></article><article className="panel"><div className="panel-heading"><div><h2>إضافة أصل أو مصروف</h2><p>يحفظ كفاتورة قابلة للتدقيق.</p></div></div><button className="primary-button wide" onClick={() => setNotice("تم فتح نموذج إضافة أصل أو فاتورة مصروف.")}>＋ إضافة سجل جديد</button></article></section>; }
function InvestorDetail({ setNotice }: { setNotice: (value: string) => void }) { return <section className="detail-two-columns"><article className="panel"><div className="panel-heading"><div><h2>توزيع الربح الحالي</h2><p>حساب واضح حسب النسب المعتمدة.</p></div></div><div className="share-bars"><div><span>المستثمر</span><b>50٪ · ١٬٢٦٠٬٠٠٠</b><i><em style={{ width: "50%" }} /></i></div><div><span>الإدارة</span><b>25٪ · ٦٣٠٬٠٠٠</b><i><em style={{ width: "25%" }} /></i></div><div><span>الكباتن والمبيعات</span><b>25٪ · ٦٣٠٬٠٠٠</b><i><em style={{ width: "25%" }} /></i></div></div></article><article className="panel"><div className="panel-heading"><div><h2>كشف المستثمر</h2><p>حركة يومية للدخل والمصروف والسحوبات.</p></div></div><button className="secondary-button wide" onClick={() => setNotice("تم تجهيز كشف المستثمر التفصيلي بصيغة PDF.")}>تنزيل كشف كامل</button></article></section>; }
function SettingsDetail({ setNotice }: { setNotice: (value: string) => void }) { return <section className="detail-two-columns"><article className="panel"><div className="panel-heading"><div><h2>بيانات النادي</h2><p>تظهر على الفواتير والتقارير.</p></div></div><div className="settings-lines"><span>اسم النادي <b>نادي القوة</b></span><span>العملة <b>الليرة السورية</b></span><span>بداية السنة المالية <b>1 يناير</b></span></div><button className="secondary-button wide" onClick={() => setNotice("تم فتح تحرير بيانات النادي.")}>تعديل البيانات</button></article><article className="panel"><div className="panel-heading"><div><h2>المستخدمون والصلاحيات</h2><p>حدّد ما يراه كل مستخدم في حسابه.</p></div></div><div className="mini-list"><span><b>المدير</b> كل الصلاحيات <i>زاهر</i></span><span><b>المستثمر</b> تقارير فقط <i>قراءة</i></span><span><b>الكابتن</b> حسابه وجدوله <i>محدود</i></span></div><button className="primary-button wide" onClick={() => setNotice("تم فتح نموذج دعوة مستخدم جديد.")}>＋ دعوة مستخدم</button></article></section>; }

function initialRecords(section: SectionKey): RecordItem[] { const data: Record<SectionKey, RecordItem[]> = { members: [{ id: 1028, name: "سارة محمود", detail: "باقة اللياقة · 3 حصص أسبوعيًا", status: "تنتهي بعد يومين", amount: 180000 }, { id: 1017, name: "أحمد الخطيب", detail: "رفع الأثقال · 4 حصص أسبوعيًا", status: "نشط", amount: 220000 }, { id: 1004, name: "مي كمال", detail: "تدريب شخصي · 8 جلسات", status: "نشط", amount: 450000 }], finance: [{ id: 4821, name: "فاتورة اشتراك سارة محمود", detail: "اشتراك شهري · تحويل", status: "مدفوعة", amount: 180000 }, { id: 4819, name: "مستحقات فهد الأبطح", detail: "سحب كابتن · نقدي", status: "مسدد جزئيًا", amount: 300000 }, { id: 4812, name: "إيجار فرع المزة", detail: "مصروف تشغيلي · بنك", status: "مدفوعة", amount: 650000 }], coaches: [{ id: 2101, name: "فهد الأبطح", detail: "كابتن قوة وتحمل · نسبة شهرية", status: "٢٠٠٬٠٠٠ متبقي", amount: 500000 }, { id: 2104, name: "لينا حمود", detail: "كابتن لياقة نسائية · راتب شهري", status: "نشط", amount: 400000 }, { id: 2112, name: "ريم محمد", detail: "استقبال · راتب شهري", status: "تم الدفع", amount: 350000 }], store: [{ id: 3011, name: "مشروب بروتين", detail: "38 قطعة متبقية · 46 مباع", status: "متوفر", amount: 112000 }, { id: 3014, name: "قفازات تدريب", detail: "17 قطعة متبقية · 21 مباع", status: "متوفر", amount: 84000 }, { id: 3020, name: "حزام رفع الأثقال", detail: "9 قطع متبقية · 12 مباع", status: "مخزون منخفض", amount: 126000 }], assets: [{ id: 4011, name: "إيجار فرع المزة", detail: "عقد شهري · يستحق 01 أغسطس", status: "قادم", amount: 650000 }, { id: 4014, name: "جهاز كابل كروس", detail: "أصل ثابت · تم الشراء في يونيو", status: "مسجل", amount: 4200000 }, { id: 4019, name: "فاتورة كهرباء", detail: "خدمات تشغيلية · يوليو", status: "معلقة", amount: 120000 }], reports: [{ id: 5011, name: "إيرادات الاشتراكات", detail: "دورة يوليو", status: "مغلق", amount: 4050000 }, { id: 5014, name: "أرباح المتجر", detail: "بعد تكلفة البضاعة", status: "مغلق", amount: 322000 }, { id: 5019, name: "حصة المستثمر", detail: "توزيع صافي الربح", status: "جاهز للتحويل", amount: 1260000 }], settings: [{ id: 6011, name: "زاهر السهلي", detail: "مدير النظام", status: "نشط" }, { id: 6012, name: "المستثمر", detail: "صلاحية التقارير فقط", status: "نشط" }, { id: 6013, name: "فهد الأبطح", detail: "حساب كابتن", status: "نشط" }] }; return data[section]; }
function actionLabel(section: SectionKey) { return ({ members: "إضافة متدرب", finance: "إنشاء فاتورة", coaches: "إضافة كابتن أو موظف", store: "إضافة منتج", assets: "إضافة أصل أو مصروف", reports: "إنشاء تقرير", settings: "إضافة مستخدم" } as Record<SectionKey, string>)[section]; }
function tableTitle(section: SectionKey) { return ({ members: "سجل المتدربين", finance: "دفتر الحسابات والفواتير", coaches: "دليل الفريق والمستحقات", store: "سجل المنتجات والمبيعات", assets: "سجل الأصول والالتزامات", reports: "تقارير مالية تفصيلية", settings: "إدارة المستخدمين" } as Record<SectionKey, string>)[section]; }
function fieldLabel(section: SectionKey) { return ({ members: "اسم المتدرب", finance: "اسم الفاتورة أو الحساب", coaches: "اسم الكابتن أو الموظف", store: "اسم المنتج", assets: "اسم الأصل أو المصروف", reports: "اسم التقرير", settings: "اسم المستخدم" } as Record<SectionKey, string>)[section]; }
function fieldPlaceholder(section: SectionKey) { return ({ members: "مثال: محمد خالد", finance: "مثال: اشتراك شهر أغسطس", coaches: "مثال: الكابتن سامر", store: "مثال: مشروب بروتين", assets: "مثال: فاتورة مياه", reports: "مثال: تقرير يوليو", settings: "مثال: موظف استقبال" } as Record<SectionKey, string>)[section]; }
function defaultDetail(section: SectionKey) { return ({ members: "الباقة، الدورة، وقت التدريب", finance: "التصنيف وطريقة الدفع", coaches: "المسمى الوظيفي ونوع الاستحقاق", store: "الكمية وسعر البيع", assets: "المورد وتاريخ الاستحقاق", reports: "المدة ونوع التقرير", settings: "الدور والصلاحيات" } as Record<SectionKey, string>)[section]; }
