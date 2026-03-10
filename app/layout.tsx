import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OnSite Dashboard — Acueducto DN1600",
  description: "Engineering dashboard for Water Corp DN1600 MSCL pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} min-h-screen bg-[#F7F7F7] font-sans text-zinc-700 antialiased`}
        style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
