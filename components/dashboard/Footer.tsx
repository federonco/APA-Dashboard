import Image from "next/image";
import packageJson from "../../package.json";
import { tokens } from "@/lib/designTokens";

export function Footer() {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Australia/Perth",
  });

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
      <a
        href="https://readx.com.au"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-70 transition-opacity hover:opacity-100"
      >
        <Image
          src="/readx.logo.png"
          alt="readX"
          width={48}
          height={14}
          style={{ height: "14px", width: "auto" }}
        />
      </a>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.65rem",
          fontFamily: "'DM Mono', monospace",
          color: tokens.text.muted,
        }}
      >
        <span
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          ALKIMOS PIPELINE ALLIANCE
        </span>
        <span>|</span>
        <span>© 2026 APA</span>
      </div>
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.65rem",
          color: tokens.text.muted,
        }}
      >
        v{packageJson.version} · {today}
      </span>
    </footer>
  );
}
