"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const urlError =
    errorParam === "forbidden"
      ? "Access denied (super admin only)"
      : errorParam === "no_dashboard_access"
        ? "No access to this dashboard for this account"
        : errorParam === "config"
          ? "Server configuration error"
          : "";

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Could not sign in");
        setLoading(false);
        return;
      }
      const defaultPath = data?.isSuperAdmin ? "/admin" : "/";
      const target =
        redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
          ? redirectParam
          : defaultPath;
      router.push(target);
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6"
      style={{ background: "#F7F7F7" }}
    >
      <div
        style={{
          padding: 32,
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #E8E6EB",
          maxWidth: 380,
          width: "100%",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Sign in</h1>
        <p style={{ fontSize: 14, color: "#71717a", marginBottom: 24 }}>
          Super admins and dashboard administrators. Email and password.
        </p>
        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            className="selection:bg-[#D1D5DB] selection:text-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #E8E6EB", fontSize: 14 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
            className="selection:bg-[#D1D5DB] selection:text-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #E8E6EB", fontSize: 14 }}
          />
          {(error || urlError) && (
            <p style={{ color: "#dc2626", fontSize: 13 }}>{error || urlError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg border-none bg-[#D1D5DB] px-4 py-2 text-[0.875rem] font-medium text-[#111827] transition-[color,background-color] duration-150 hover:bg-[#E5E7EB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {loading && (
            <div
              className="flex items-center justify-center gap-2"
              style={{ fontSize: 13, color: "#71717a" }}
              aria-live="polite"
            >
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-solid border-[#d4d4d8] border-t-[#52525b]"
                aria-hidden
              />
              <span>Checking credentials...</span>
            </div>
          )}
        </form>
        <Link
          href="/"
          className="mt-5 inline-block text-[0.875rem] font-medium text-[#111827] no-underline transition-opacity duration-150 hover:opacity-75"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function LoginPageClient() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
