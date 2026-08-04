import type { Metadata } from "next";
import "./globals.css";
import "./portal.css";
import "./data-pages.css";
import "./forms.css";
import "./ko.css";
import "./booking.css";
import "./responsive-fixes.css";
import "./today.css";
import "./ko-theme.css";
import "./finance-center.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://kofighter.netlify.app"),
  title: "KO | نادي الفنون القتالية واللياقة",
  description: "KO نادي الفنون القتالية والقوة واللياقة — تدريبات احترافية، دورات ومتجر رياضي.",
  openGraph: { title: "KO | قوة منضبطة. مقاتل أقوى.", description: "منصة نادي KO للدورات الرياضية والمتجر وإدارة الأعضاء.", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "KO | نادي الفنون القتالية واللياقة", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
