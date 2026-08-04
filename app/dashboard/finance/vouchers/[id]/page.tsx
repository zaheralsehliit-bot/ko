"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell, ErrorState, LoadingState, money, StatusBadge } from "@/app/_components/admin-shell";

type Voucher = {
  voucher_number: string; voucher_type: string; direction: string; status: string; amount: number; currency: string; occurred_at: string; title: string; reason?: string; notes?: string;
  members?: { full_name?: string }; courses?: { name?: string }; staff?: { full_name?: string }; invoices?: { invoice_number?: string };
  finance_attachments?: Array<{ id: string; url: string; file_name: string }>;
  expense_responsibility_allocations?: Array<{ id: string; allocation_percent?: number; allocation_amount?: number; finance_partners?: { name?: string } }>;
};

export default function VoucherPage() {
  const { id } = useParams<{ id: string }>();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [error, setError] = useState("");
  const [reversing, setReversing] = useState(false);
  useEffect(() => { fetch(`/api/finance/vouchers/${id}`).then(async r => ({ ok: r.ok, data: await r.json() })).then(({ ok, data }) => ok ? setVoucher(data.voucher) : setError(data.error || "تعذر تحميل القسيمة.")) .catch(() => setError("تعذر الاتصال بالخادم.")); }, [id]);
  if (error) return <AdminShell title="قيد مالي"><ErrorState message={error} /></AdminShell>;
  if (!voucher) return <AdminShell title="قيد مالي"><LoadingState /></AdminShell>;
  const reverse = async () => { const reason = window.prompt("سبب عكس القسيمة:"); if (!reason?.trim()) return; setReversing(true); const response = await fetch(`/api/finance/vouchers/${id}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"void",reason}) }); const data = await response.json(); if (!response.ok) setError(data.error || "تعذر عكس القسيمة."); else window.location.assign(`/dashboard/finance/vouchers/${data.reversalVoucherId}`); setReversing(false); };
  const rows = [["التاريخ", new Date(voucher.occurred_at).toLocaleString("ar-SY")], ["النوع", voucher.voucher_type], ["الاتجاه", voucher.direction], ["المتدرب", voucher.members?.full_name || "—"], ["الدورة", voucher.courses?.name || "—"], ["الكابتن", voucher.staff?.full_name || "—"], ["الفاتورة", voucher.invoices?.invoice_number || "—"]];
  return <AdminShell title={`قسيمة ${voucher.voucher_number}`} subtitle="وثيقة مالية قابلة للتدقيق؛ لا تُحذف القيود المعتمدة بل تُعكس بقيد مرجعي." action={<div className="header-actions"><Link className="secondary-button" href="/dashboard/finance/transactions">القيود</Link>{voucher.status !== "void" && <button className="danger-button" disabled={reversing} onClick={reverse}>{reversing ? "جارِ العكس…" : "عكس القسيمة"}</button>}<button className="primary-button" onClick={() => window.print()}>طباعة / حفظ PDF</button></div>}>
    <article className="finance-voucher panel">
      <header><div><p className="eyebrow">KO FIGHTERS · FINANCIAL VOUCHER</p><h2>{voucher.title}</h2><p>{voucher.voucher_number}</p></div><StatusBadge>{voucher.status}</StatusBadge></header>
      <section className="finance-voucher-amount"><span>المبلغ</span><strong>{money(voucher.amount)} <small>{voucher.currency}</small></strong></section>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {voucher.reason && <p><b>السبب:</b> {voucher.reason}</p>}{voucher.notes && <p><b>ملاحظات:</b> {voucher.notes}</p>}
      {voucher.expense_responsibility_allocations?.length ? <section><h3>تحميل المسؤولية</h3><div className="data-table"><table><thead><tr><th>الشريك</th><th>النسبة</th><th>المبلغ</th></tr></thead><tbody>{voucher.expense_responsibility_allocations.map(a => <tr key={a.id}><td>{a.finance_partners?.name || "—"}</td><td>{a.allocation_percent ?? "—"}%</td><td>{a.allocation_amount === undefined ? "—" : money(a.allocation_amount)}</td></tr>)}</tbody></table></div></section> : null}
      {voucher.finance_attachments?.length ? <section><h3>المرفقات</h3>{voucher.finance_attachments.map(a => <a className="detail-link" key={a.id} href={a.url} target="_blank" rel="noreferrer">{a.file_name}</a>)}</section> : null}
      <footer>KO Fighters · قسيمة مرجعية ضمن دفتر مالي موثّق</footer>
    </article>
  </AdminShell>;
}
