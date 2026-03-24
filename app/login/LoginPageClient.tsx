"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(redirect);
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
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Login</h1>
        <p style={{ fontSize: 14, color: "#71717a", marginBottom: 24 }}>
          Enter your email and password to sign in.
        </p>
        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="selection:bg-[#D1D5DB] selection:text-[#111827]"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #E8E6EB", fontSize: 14 }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="selection:bg-[#D1D5DB] selection:text-[#111827]"
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #E8E6EB", fontSize: 14 }}
          />
          {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg border-none bg-[#D1D5DB] px-4 py-2 text-[0.875rem] font-medium text-[#111827] transition-[color,background-color] duration-150 hover:bg-[#E5E7EB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
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