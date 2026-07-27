import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ناديك | الإدارة المالية للنادي الرياضي",
  description: "نظام احترافي لإدارة اشتراكات النادي، الحسابات، الكباتن، المبيعات، والمستثمرين.",
  openGraph: { title: "ناديك | الإدارة المالية للنادي الرياضي", description: "كل حسابات ناديك في لوحة واحدة واضحة.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "ناديك | الإدارة المالية للنادي الرياضي", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
