import Image from "next/image";
import packageJson from "../../package.json";
import { tokens } from "@/lib/designTokens";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${tokens.theme.border}`,
        padding: "1rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        background: tokens.theme.background,
      }}
    >
      <div
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.05em",
          fontSize: "0.75rem",
          color: tokens.text.primary,
          textAlign: "center",
        }}
      >
        APA - Dashboard
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.7rem",
          color: tokens.text.muted,
        }}
      >
        <span>Created by</span>
        <a
          href="https://readx.com.au"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-80 transition-opacity hover:opacity-100"
        >
          <Image
            src="/readx.logo.png"
            alt="readX"
            width={52}
            height={14}
            style={{ height: "14px", width: "auto" }}
          />
        </a>
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.7rem",
          color: tokens.text.muted,
          textAlign: "center",
        }}
      >
        All Rights Reserved
      </div>
    </footer>
  );
}
