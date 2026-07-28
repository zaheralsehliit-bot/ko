import Link from "next/link";
import { ReactNode } from "react";

const links = [["/", "نظرة عامة"], ["/members", "المتدربون"], ["/coaches", "الكباتن والموظفون"], ["/courses", "الدورات"], ["/finance", "الحسابات والفواتير"], ["/store", "المتجر والمخزون"], ["/reports", "تقارير المستثمر"], ["/users", "المستخدمون"]] as const;

export function AdminShell({ title, subtitle, children, action, active }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode; active?: string }) {
  return <main dir="rtl" className="app-shell data-shell"><aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">ن</span><span>ناديك<span className="brand-dot">.</span></span></Link><div className="club-switcher"><span className="club-icon">⌁</span><div><b>نادي القوة</b><small>الفرع الرئيسي</small></div></div><nav aria-label="التنقل الرئيسي">{links.map(([href,label]) => <Link key={href} className={`nav-item ${active === href ? "active" : ""}`} href={href}><span>◈</span>{label}</Link>)}</nav><div className="sidebar-bottom"><Link className="nav-item" href="/settings"><span>⚙</span>الإعدادات</Link><Link className="profile" href="/login"><span className="avatar owner">ز</span><div><b>بوابة الحساب</b><small>دخول آمن</small></div></Link></div></aside><section className="workspace"><header className="topbar"><Link className="portal-link" href="/portal/admin">بوابة الإدارة</Link><div className="date-chip">إدارة النادي</div></header><div className="content data-content"><section className="page-heading"><div><p className="eyebrow">ناديك · إدارة البيانات</p><h1>{title}</h1>{subtitle && <p className="subhead">{subtitle}</p>}</div>{action}</section>{children}</div></section></main>;
}

export const money = (value: number | string | null | undefined) => `${new Intl.NumberFormat("ar-SY").format(Number(value ?? 0))} ل.س`;
export function LoadingState() { return <div className="data-state"><span className="loader" /> جارِ تحميل البيانات…</div>; }
export function ErrorState({ message }: { message: string }) { return <div className="data-state error-state">{message}</div>; }
export function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="data-state"><b>{title}</b><small>{detail}</small></div>; }
export function StatusBadge({ children }: { children: ReactNode }) { return <span className="status-badge">{children}</span>; }
