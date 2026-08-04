import Link from "next/link";
import { ReactNode } from "react";

const links = [["/portal/admin", "نظرة عامة"], ["/dashboard/today", "جدول اليوم"], ["/members", "المتدربون"], ["/coaches", "الكباتن والموظفون"], ["/dashboard/courses", "الدورات"], ["/schedule", "المواعيد والحجوزات"], ["/schedule/online", "مواعيد الأونلاين"], ["/dashboard/finance", "الحسابات والفواتير"], ["/store", "المتجر والمخزون"], ["/reports", "تقارير المستثمر"], ["/users", "المستخدمون"]] as const;

export function AdminShell({ title, subtitle, children, action, active }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode; active?: string }) {
  return <main dir="rtl" className="app-shell data-shell ko-dashboard"><aside className="sidebar"><Link className="brand ko-dashboard-brand" href="/portal/admin"><span className="brand-mark">KO</span><span>KO <small>FIGHTERS</small></span></Link><div className="club-switcher"><span className="club-icon">K</span><div><b>KO Fighters</b><small>الفرع الرئيسي</small></div></div><nav aria-label="التنقل الرئيسي">{links.map(([href, label]) => <Link key={href} className={`nav-item ${active === href ? "active" : ""}`} href={href}><span>◆</span>{label}</Link>)}</nav><div className="sidebar-bottom"><Link className="nav-item" href="/settings"><span>⚙</span>الإعدادات</Link><Link className="profile" href="/login"><span className="avatar owner">KO</span><div><b>حساب الإدارة</b><small>دخول آمن</small></div></Link></div></aside><section className="workspace"><header className="topbar"><Link className="portal-link" href="/portal/admin">لوحة إدارة KO</Link><div className="date-chip">KO Fighters Dashboard</div></header><div className="content data-content"><section className="page-heading"><div><p className="eyebrow">KO FIGHTERS · إدارة النادي</p><h1>{title}</h1>{subtitle && <p className="subhead">{subtitle}</p>}</div>{action}</section>{children}</div></section></main>;
}

export const money = (value: number | string | null | undefined) => `${new Intl.NumberFormat("ar-SY").format(Number(value ?? 0))} ل.س`;
export function LoadingState() { return <div className="data-state"><span className="loader" /> جارٍ تحميل البيانات…</div>; }
export function ErrorState({ message }: { message: string }) { return <div className="data-state error-state">{message}</div>; }
export function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="data-state"><b>{title}</b><small>{detail}</small></div>; }
export function StatusBadge({ children }: { children: ReactNode }) { return <span className="status-badge">{children}</span>; }
