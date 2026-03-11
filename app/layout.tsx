import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "OnSite Dashboard — Alkimos Pipeline Alliance DN1600",
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
        className={`${barlow.variable} min-h-screen bg-[#080808] font-sans text-sm text-white antialiased`}
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, sans-serif",
          ["--font-barlow" as string]: "var(--font-barlow)",
          ["--font-dm-mono" as string]: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
        }}
      >
        {children}
      </body>
    </html>
  );
}
