"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Movement = {
  id: number;
  title: string;
  person: string;
  category: string;
  amount: number;
  direction: "in" | "out";
  date: string;
  method: string;
};

const money = (value: number) => `${new Intl.NumberFormat("ar-SY").format(value)} ل.س`;

const initialMovements: Movement[] = [
  { id: 1, title: "سحب مستحقات", person: "الكابتن فهد الأبطح", category: "رواتب الكباتن", amount: 300000, direction: "out", date: "اليوم، 10:35 ص", method: "نقدي" },
  { id: 2, title: "تجديد اشتراك", person: "سارة محمود", category: "اشتراكات", amount: 180000, direction: "in", date: "اليوم، 09:20 ص", method: "تحويل" },
  { id: 3, title: "بيع منتج", person: "مشروب بروتين", category: "مبيعات المتجر", amount: 85000, direction: "in", date: "أمس، 07:45 م", method: "نقدي" },
  { id: 4, title: "دفعة إيجار", person: "فرع المزة", category: "إيجارات", amount: 650000, direction: "out", date: "أمس، 01:00 م", method: "تحويل بنكي" },
];

const accounts = [
  { name: "الكابتن فهد الأبطح", role: "كابتن — نسبة شهرية", due: 500000, paid: 300000, accent: "violet", initials: "فأ" },
  { name: "ريم محمد", role: "موظفة استقبال — راتب شهري", due: 350000, paid: 350000, accent: "blue", initials: "رم" },
  { name: "نادي سكاي فيت", role: "إيجار الفرع الرئيسي", due: 650000, paid: 650000, accent: "orange", initials: "سف" },
];

const products = [
  { name: "مشروب بروتين", stock: 38, sold: 46, sales: 391000, profit: 112000 },
  { name: "قفازات تدريب", stock: 17, sold: 21, sales: 315000, profit: 84000 },
  { name: "حزام رفع الأثقال", stock: 9, sold: 12, sales: 420000, profit: 126000 },
];

export default function Home() {
  const [movements, setMovements] = useState(initialMovements);
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showRenewForm, setShowRenewForm] = useState(false);
  const [notice, setNotice] = useState("");

  const cashBalance = useMemo(
    () => 2850000 + movements.reduce((sum, item) => sum + (item.direction === "in" ? item.amount : -item.amount), 0),
    [movements],
  );
  const accountBalance = selectedAccount.due - selectedAccount.paid;

  useEffect(() => {
    fetch("/api/movements")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.movements?.length) return;
        setMovements(data.movements.map((item: { id: number; title: string; accountName: string; category: string; amount: number; direction: "in" | "out"; paymentMethod: string; createdAt: string }) => ({ id: item.id, title: item.title, person: item.accountName, category: item.category, amount: item.amount, direction: item.direction, date: item.createdAt, method: item.paymentMethod })));
      })
      .catch(() => undefined);
  }, []);

  async function addMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const direction = form.get("direction") as "in" | "out";
    const value = Number(form.get("amount"));
    const title = String(form.get("title") || "حركة مالية");
    const person = String(form.get("person") || "إدارة النادي");
    if (!value || value < 1) return;

    const category = String(form.get("category") || "متفرقات");
    const method = String(form.get("method") || "نقدي");
    try {
      const response = await fetch("/api/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, accountName: person, category, amount: value, direction, paymentMethod: method }) });
      if (!response.ok) throw new Error("save failed");
      const { movement } = await response.json();
      setMovements((items) => [{ id: movement.id, title, person, category, amount: value, direction, date: "الآن", method }, ...items]);
      setShowMovementForm(false);
      setNotice("تم تسجيل الحركة المالية وحفظها في دفتر الحسابات.");
    } catch {
      setNotice("تعذر الحفظ الآن. تحقق من إعداد قاعدة البيانات ثم أعد المحاولة.");
    }
  }

  async function renewSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("member") || "متدرب جديد");
    const amount = Number(form.get("amount")) || 180000;
    try {
      const response = await fetch("/api/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "تجديد اشتراك", accountName: name, category: "اشتراكات", amount, direction: "in", paymentMethod: "نقدي" }) });
      if (!response.ok) throw new Error("save failed");
      const { movement } = await response.json();
      setMovements((items) => [{ id: movement.id, title: "تجديد اشتراك", person: name, category: "اشتراكات", amount, direction: "in", date: "الآن", method: "نقدي" }, ...items]);
      setShowRenewForm(false);
      setNotice(`تم تجديد اشتراك ${name} وإضافة الفاتورة إلى الحسابات.`);
    } catch {
      setNotice("تعذر حفظ التجديد الآن. تحقق من إعداد قاعدة البيانات ثم أعد المحاولة.");
    }
  }

  return (
    <main dir="rtl" className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">ن</span><span>ناديك<span className="brand-dot">.</span></span></div>
        <div className="club-switcher"><span className="club-icon">⌁</span><div><b>نادي القوة</b><small>الفرع الرئيسي</small></div><span className="chevron">⌄</span></div>
        <nav aria-label="التنقل الرئيسي">
          <Link className="nav-item active" href="/"><span>▦</span>نظرة عامة</Link>
          <Link className="nav-item" href="/members"><span>♙</span>المتدربون <em>128</em></Link>
          <Link className="nav-item" href="/finance"><span>◫</span>الحسابات والفواتير</Link>
          <Link className="nav-item" href="/coaches"><span>♟</span>الكباتن والموظفون</Link>
          <Link className="nav-item" href="/store"><span>▣</span>المتجر والمخزون</Link>
          <Link className="nav-item" href="/assets"><span>◇</span>الأصول والمصروفات</Link>
          <Link className="nav-item" href="/reports"><span>◔</span>تقارير المستثمر</Link>
        </nav>
        <div className="sidebar-bottom"><Link className="nav-item" href="/settings"><span>⚙</span>الإعدادات</Link><div className="profile"><span className="avatar owner">ز</span><div><b>زاهر السهلي</b><small>المدير</small></div><span>⌄</span></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><button className="circle-button" aria-label="إشعارات">♧<i /></button><div className="date-chip">27 يوليو 2026 <span>⌄</span></div></header>
        <div className="content">
          <section id="overview" className="page-heading"><div><p className="eyebrow">لوحة الإدارة المالية</p><h1>صباح الخير، زاهر <span>👋</span></h1><p className="subhead">إليك ملخص أداء النادي وحركة الأموال لهذا الشهر.</p></div><div className="header-actions"><button className="secondary-button" onClick={() => setShowRenewForm(true)}>＋ تجديد اشتراك</button><button className="primary-button" onClick={() => setShowMovementForm(true)}>＋ تسجيل حركة مالية</button></div></section>

          {notice && <div className="notice" role="status">✓ {notice}<button onClick={() => setNotice("")}>×</button></div>}

          <section className="metrics-grid" aria-label="ملخص الشهر">
            <Metric icon="↗" tint="green" label="إجمالي الدخل" value="٤٬٨٥٠٬٠٠٠" change="↑ ١٢٫٥٪" detail="مقارنة بالشهر الماضي" />
            <Metric icon="↙" tint="red" label="إجمالي المصروفات" value="٢٬٣٣٠٬٠٠٠" change="↑ ٤٫٢٪" detail="ضمن الميزانية المحددة" />
            <Metric icon="◈" tint="purple" label="صافي الربح" value="٢٬٥٢٠٬٠٠٠" change="↑ ١٩٫٨٪" detail="هامش الربح ٥٢٪" />
            <Metric icon="◉" tint="amber" label="الرصيد المتاح" value={new Intl.NumberFormat("ar-SY").format(cashBalance)} change="● محدث الآن" detail="في الصندوق والحساب البنكي" />
          </section>

          <section className="dashboard-grid">
            <article id="finance" className="panel transactions-panel"><div className="panel-heading"><div><h2>آخر الحركات المالية</h2><p>كل قبض وسحب موثق باسم الحساب</p></div><a href="#finance">عرض الكل ←</a></div><div className="transactions-list">{movements.slice(0, 5).map((movement) => <MovementRow key={movement.id} movement={movement} />)}</div></article>
            <article id="members" className="panel subscriptions-panel"><div className="panel-heading"><div><h2>الاشتراكات القريبة</h2><p>متدربون يحتاجون متابعة</p></div><span className="warning-badge">7 بحاجة لتجديد</span></div><div className="member-row"><span className="avatar mint">س</span><div><b>سارة محمود</b><small>باقة اللياقة — تنتهي بعد يومين</small></div><button onClick={() => { setShowRenewForm(true); }}>تجديد</button></div><div className="member-row"><span className="avatar rose">أ</span><div><b>أحمد الخطيب</b><small>رفع الأثقال — تنتهي بعد 4 أيام</small></div><button onClick={() => { setShowRenewForm(true); }}>تجديد</button></div><div className="class-card"><div><span className="class-time">06:00 م</span><b>تدريب جماعي — قوة وتحمل</b><small>الكابتن فهد الأبطح · 14/20 متدرب</small></div><span className="live-pill">اليوم</span></div></article>
          </section>

          <section id="coaches" className="dashboard-grid lower-grid">
            <article className="panel accounts-panel"><div className="panel-heading"><div><h2>حسابات الكباتن والموظفين</h2><p>اعرف رصيد كل شخص ومستحقاته لحظيًا</p></div><button className="text-button" onClick={() => setShowMovementForm(true)}>تسجيل سحب</button></div><div className="account-list">{accounts.map((account) => <button className={`account-row ${selectedAccount.name === account.name ? "selected" : ""}`} key={account.name} onClick={() => setSelectedAccount(account)}><span className={`avatar ${account.accent}`}>{account.initials}</span><span className="account-main"><b>{account.name}</b><small>{account.role}</small></span><span className="account-numbers"><small>المتبقي له</small><strong>{money(account.due - account.paid)}</strong></span><span className="arrow">‹</span></button>)}</div></article>
            <article className="panel account-detail"><div className="account-detail-top"><div className={`avatar big ${selectedAccount.accent}`}>{selectedAccount.initials}</div><div><p>حساب شخصي</p><h2>{selectedAccount.name}</h2><small>{selectedAccount.role}</small></div><button className="more">•••</button></div><div className="balance-card"><span>الرصيد المستحق من النادي</span><strong>{money(accountBalance)}</strong><div><span>إجمالي الاستحقاق <b>{money(selectedAccount.due)}</b></span><span>المسحوب <b>{money(selectedAccount.paid)}</b></span></div><div className="progress"><i style={{ width: `${Math.min(100, (selectedAccount.paid / selectedAccount.due) * 100)}%` }} /></div></div><button className="primary-button wide" onClick={() => setShowMovementForm(true)}>تسجيل سحب من الحساب</button><p className="account-note">مثال واضح: استحق الكابتن فهد ٥٠٠٬٠٠٠ ل.س، سحب ٣٠٠٬٠٠٠ ل.س، والمتبقي له الآن ٢٠٠٬٠٠٠ ل.س.</p></article>
          </section>

          <section id="store" className="dashboard-grid lower-grid store-grid"><article className="panel inventory-panel"><div className="panel-heading"><div><h2>المتجر والمخزون</h2><p>المبيعات والأرباح حسب المنتج</p></div><button className="text-button" onClick={() => setNotice("يمكنك إضافة منتج جديد من إدارة المخزون.")}>＋ إضافة منتج</button></div><div className="product-table"><div className="table-head"><span>المنتج</span><span>المخزون</span><span>المباع</span><span>الربح</span></div>{products.map((product) => <div className="product-row" key={product.name}><span><b>{product.name}</b><small>مبيعات {money(product.sales)}</small></span><span>{product.stock} قطعة</span><span>{product.sold}</span><strong>{money(product.profit)}</strong></div>)}</div></article><article id="reports" className="panel investor-panel"><div className="panel-heading"><div><h2>ملخص المستثمر</h2><p>شفافية كاملة في حركة المال</p></div><span className="investor-icon">◫</span></div><div className="investor-number"><span>صافي ربح الشهر</span><strong>٢٬٥٢٠٬٠٠٠ <small>ل.س</small></strong></div><div className="share-bars"><div><span>المستثمر</span><b>50٪</b><i><em style={{ width: "50%" }} /></i></div><div><span>الإدارة</span><b>25٪</b><i><em style={{ width: "25%" }} /></i></div><div><span>الكباتن والمبيعات</span><b>25٪</b><i><em style={{ width: "25%" }} /></i></div></div><button className="secondary-button wide" onClick={() => setNotice("تم تجهيز تقرير المستثمر التفصيلي لهذا الشهر.")}>عرض تقرير المستثمر</button></article></section>

          <section id="assets" className="panel bottom-summary"><div><span className="soft-icon">◈</span><div><h2>المصروفات والأصول</h2><p>الإيجار الشهري، معدات النادي، والكهرباء موثقة ضمن فواتير قابلة للتدقيق.</p></div></div><div className="expense-chips"><span><small>إيجار الفرع</small><b>٦٥٠٬٠٠٠ ل.س</b></span><span><small>رواتب الموظفين</small><b>٨٢٠٬٠٠٠ ل.س</b></span><span><small>فواتير معلقة</small><b className="orange-text">٣ فواتير</b></span></div></section>
        </div>
      </section>

      {(showMovementForm || showRenewForm) && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-label={showRenewForm ? "تجديد اشتراك" : "تسجيل حركة مالية"}><button className="modal-close" onClick={() => { setShowMovementForm(false); setShowRenewForm(false); }}>×</button>{showRenewForm ? <form onSubmit={renewSubscription}><p className="eyebrow">الاشتراكات</p><h2>تجديد اشتراك متدرب</h2><label>اسم المتدرب<input name="member" required placeholder="مثال: سارة محمود" /></label><label>الباقة والدورة<select name="course"><option>لياقة شهرية — 3 حصص أسبوعيًا</option><option>رفع أثقال — 4 حصص أسبوعيًا</option><option>تدريب شخصي</option></select></label><label>قيمة التجديد<input name="amount" type="number" defaultValue="180000" /></label><button className="primary-button wide" type="submit">إنشاء الفاتورة وتجديد الاشتراك</button></form> : <form onSubmit={addMovement}><p className="eyebrow">دفتر الحسابات</p><h2>تسجيل حركة مالية</h2><label>نوع الحركة<select name="direction"><option value="in">قبض / دخل</option><option value="out">سحب / مصروف</option></select></label><label>البيان<input name="title" required placeholder="مثال: سحب مستحقات" /></label><label>الحساب أو الشخص<input name="person" required placeholder="مثال: الكابتن فهد الأبطح" /></label><div className="form-grid"><label>التصنيف<select name="category"><option>رواتب الكباتن</option><option>اشتراكات</option><option>مبيعات المتجر</option><option>إيجارات</option><option>مصروفات تشغيل</option></select></label><label>المبلغ<input name="amount" type="number" min="1" required placeholder="0" /></label></div><label>طريقة الدفع<select name="method"><option>نقدي</option><option>تحويل بنكي</option><option>محفظة إلكترونية</option></select></label><button className="primary-button wide" type="submit">حفظ الحركة وإنشاء الفاتورة</button></form>}</section></div>}
    </main>
  );
}

function Metric({ icon, tint, label, value, change, detail }: { icon: string; tint: string; label: string; value: string; change: string; detail: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tint}`}>{icon}</div><div className="metric-label"><span>{label}</span><small className={tint === "red" ? "neutral" : "positive"}>{change}</small></div><strong>{value} <small>ل.س</small></strong><p>{detail}</p></article>;
}

function MovementRow({ movement }: { movement: Movement }) {
  const incoming = movement.direction === "in";
  return <div className="movement-row"><span className={`movement-icon ${incoming ? "income" : "expense"}`}>{incoming ? "↓" : "↑"}</span><div className="movement-main"><b>{movement.title}</b><small>{movement.person} <i>·</i> {movement.category}</small></div><div className="movement-date"><small>{movement.date}</small><span>{movement.method}</span></div><strong className={incoming ? "in" : "out"}>{incoming ? "+" : "−"}{money(movement.amount)}</strong></div>;
}
