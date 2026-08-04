"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminShell, EmptyState, ErrorState, LoadingState, money, StatusBadge } from "@/app/_components/admin-shell";
import { WhatsAppAction } from "@/app/_components/whatsapp-action";

type Member = {
  id: string; member_code: string | null; full_name: string; phone: string | null; whatsapp: string | null; membership_status: string; renewal_date: string | null; monthly_fee: number; staff: { full_name: string } | null;
  subscription: { courses: { id: string; name: string; monthly_price: number } | null; end_date: string; amount: number } | null;
};

function defaultEndDate(member: Member) {
  const base = member.renewal_date && new Date(`${member.renewal_date}T12:00:00`) > new Date() ? new Date(`${member.renewal_date}T12:00:00`) : new Date();
  base.setDate(base.getDate() + 30);
  return base.toISOString().slice(0, 10);
}

export default function MembersPage() {
  const [rows, setRows] = useState<Member[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [quickRenewal, setQuickRenewal] = useState<Member | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [notice, setNotice] = useState("");

  const load = () => fetch(`/api/members?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}`)
    .then(async response => ({ ok: response.ok, data: await response.json() }))
    .then(({ ok, data }) => { if (!ok) throw new Error(); setRows(data.members); setState("ready"); });

  useEffect(() => { let cancelled = false; load().catch(() => !cancelled && setState("error")); return () => { cancelled = true; }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status]);

  async function renewQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickRenewal?.subscription?.courses) return;
    setRenewing(true); setNotice("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/members/${quickRenewal.id}/renew`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: quickRenewal.subscription.courses.id, endDate: form.get("endDate"), amount: Number(form.get("amount")), paid: form.get("paid") === "on", method: form.get("method"), idempotencyKey: crypto.randomUUID() }) });
    const data = await response.json();
    setRenewing(false);
    if (!response.ok) { setNotice(data.error || "تعذر إتمام التجديد."); return; }
    setQuickRenewal(null); setNotice(`تم تجديد اشتراك ${quickRenewal.full_name} بنجاح.`); load().catch(() => setState("error"));
  }

  const content = state === "loading" ? <LoadingState /> : state === "error" ? <ErrorState message="تعذر تحميل المتدربين. تحقق من صلاحية الإدارة واتصال Supabase." /> : rows.length === 0 ? <EmptyState title="لا يوجد متدربون" detail="أضف أول متدرب أو غيّر الفلاتر." /> : <article className="panel table-card"><div className="data-table"><table><thead><tr><th>المتدرب</th><th>الهاتف</th><th>واتساب سريع</th><th>الدورة الحالية</th><th>الكابتن</th><th>التجديد</th><th>الرسوم</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><b>{row.full_name}</b><small>{row.member_code || "—"}</small></td><td>{row.phone || "—"}</td><td><WhatsAppAction phone={row.whatsapp || row.phone} name={row.full_name} /></td><td>{row.subscription?.courses ? <><b>{row.subscription.courses.name}</b><small>{money(row.subscription.amount)}</small></> : "لا يوجد اشتراك"}</td><td>{row.staff?.full_name || "غير مخصص"}</td><td>{row.renewal_date || "—"}</td><td>{money(row.monthly_fee)}</td><td><StatusBadge>{row.membership_status}</StatusBadge></td><td><div className="member-row-actions">{row.subscription?.courses && <button className="secondary-button" onClick={() => { setNotice(""); setQuickRenewal(row); }}>تجديد سريع</button>}<Link href={`/members/${row.id}`}>التفاصيل ←</Link></div></td></tr>)}</tbody></table></div></article>;

  return <AdminShell title="إدارة المتدربين" subtitle="ملفات حقيقية، اشتراكات، أرصدة، وحضور لكل متدرب." active="/members" action={<Link className="primary-button" href="/users">＋ إضافة مستخدم</Link>}>
    {notice && <p className="notice">{notice}</p>}
    <div className="data-toolbar"><input aria-label="بحث في المتدربين" value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الرقم أو الهاتف" /><select aria-label="فلترة الحالة" value={status} onChange={event => setStatus(event.target.value)}><option value="">كل الحالات</option><option>نشط</option><option>مبدئي</option><option>بانتظار الدفع</option><option>موقوف</option></select></div>
    {content}
    {quickRenewal && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="quick-renewal-title"><button className="modal-close" aria-label="إغلاق" onClick={() => setQuickRenewal(null)}>×</button><form onSubmit={renewQuick}><p className="eyebrow">تجديد سريع</p><h2 id="quick-renewal-title">{quickRenewal.full_name}</h2><p>{quickRenewal.subscription?.courses?.name} · {quickRenewal.renewal_date || "اشتراك جديد"}</p><label>تاريخ الانتهاء<input name="endDate" type="date" defaultValue={defaultEndDate(quickRenewal)} required /></label><label>المبلغ<input name="amount" type="number" min="1" defaultValue={quickRenewal.subscription?.amount || quickRenewal.monthly_fee} required /></label><label>طريقة الدفع<select name="method"><option>نقدي</option><option>تحويل بنكي</option><option>محفظة إلكترونية</option></select></label><label className="check-field"><input name="paid" type="checkbox" defaultChecked />تم القبض الآن وتسجيل الدفعة</label><button className="primary-button wide" disabled={renewing}>{renewing ? "جارِ التجديد…" : "تأكيد التجديد"}</button></form></section></div>}
  </AdminShell>;
}
