import Image from "next/image";
import { tokens } from "@/lib/designTokens";
import { MANROPE_STACK } from "@/lib/fonts";

export function Footer() {
  return (
    <footer
      style={{
        padding: "1rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tokens.theme.background,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.35rem",
          rowGap: "0.25rem",
          fontFamily: MANROPE_STACK,
          fontSize: "0.75rem",
          fontWeight: 400,
          color: tokens.text.muted,
          textAlign: "center",
        }}
      >
        <span>Created by </span>
        <a
          href="https://readx.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center opacity-80 transition-opacity hover:opacity-100"
        >
          <Image
            src="/readx.logo.png"
            alt="readX"
            width={52}
            height={14}
            style={{ height: "0.75rem", width: "auto", verticalAlign: "middle" }}
          />
        </a>
        <span> - </span>
        <span>APA Dashboard</span>
        <span> - All rights reserved</span>
      </div>
    </footer>
  );
}
