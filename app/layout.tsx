import type { Metadata } from "next";
import { DM_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className="dark">
      <body
        className={`${dmMono.variable} ${barlowCondensed.variable} min-h-screen bg-[#080808] font-sans text-zinc-200 antialiased`}
        style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
      >
        {children}
      </body>
    </html>
  );
}
