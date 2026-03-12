import packageJson from "../../package.json";
import { tokens } from "@/lib/designTokens";

export function Footer() {
  const year = new Date().getFullYear();
  const version = packageJson.version;

  return (
    <footer
      style={{
        borderTop: `1px solid ${tokens.theme.border}`,
        background: tokens.theme.card,
        padding: "16px 24px",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <span
            style={{
              fontSize: tokens.typography.body,
              fontWeight: 700,
              textTransform: "uppercase",
              color: tokens.text.secondary,
            }}
          >
            Alkimos Pipeline Alliance
          </span>
          <span style={{ color: tokens.text.muted }}>|</span>
          <span
            style={{
              fontSize: tokens.typography.label,
              color: tokens.text.muted,
            }}
          >
            © {year} APA
          </span>
        </div>
        <div
          style={{
            fontSize: tokens.typography.label,
            color: tokens.text.muted,
          }}
        >
          v{version} · {new Date().toISOString().split("T")[0]}
        </div>
      </div>
    </footer>
  );
}
