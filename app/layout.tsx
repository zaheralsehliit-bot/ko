import type { Metadata } from "next";
import "./globals.css";
import "./portal.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nadiak-club-finance-2026.zaher-alsehli-it.chatgpt.site"),
  title: "ناديك | الإدارة المالية للنادي الرياضي",
  description: "نظام احترافي لإدارة اشتراكات النادي، الحسابات، الكباتن، المبيعات، والمستثمرين.",
  openGraph: { title: "ناديك | الإدارة المالية للنادي الرياضي", description: "كل حسابات ناديك في لوحة واحدة واضحة.", images: ["https://nadiak-club-finance-2026.zaher-alsehli-it.chatgpt.site/og.png"] },
  twitter: { card: "summary_large_image", title: "ناديك | الإدارة المالية للنادي الرياضي", images: ["https://nadiak-club-finance-2026.zaher-alsehli-it.chatgpt.site/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
