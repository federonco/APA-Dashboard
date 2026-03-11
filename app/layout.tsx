import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import { tokens } from "@/lib/designTokens";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Alkimos Pipeline Alliance - DN1600 Trunk Main",
  description: "Engineering dashboard for Water Corp DN1600 MSCL pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${inter.variable} min-h-screen antialiased`}
        style={{
          background: tokens.theme.background,
          fontFamily: tokens.typography.fontFamily,
          color: tokens.text.primary,
          fontSize: tokens.typography.body,
        }}
      >
        {children}
      </body>
    </html>
  );
}
