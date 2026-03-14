import type { Metadata } from "next";
import { Manrope } from "next/font/google";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Admin — APA Dashboard",
  description: "Admin panel for Alkimos Pipeline Alliance",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${manrope.variable} font-sans`} style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
      {children}
    </div>
  );
}
