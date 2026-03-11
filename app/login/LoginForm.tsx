"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const { data: admin } = await supabase
        .from("psp_admins")
        .select("role")
        .eq("email", email)
        .single();

      if (!admin) {
        setError("User not authorized");
        return;
      }

      if (admin.role === "superadmin") {
        router.push("/admin/control-panel");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="mb-2 block text-xs uppercase text-[#999]">Email</label>
        <input
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#f97316]"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase text-[#999]">
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#f97316]"
        />
      </div>

      {error && (
        <div className="rounded border border-red-900 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="hover:bg-[#e67e1f] w-full rounded bg-[#f97316] px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#f97316]"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
