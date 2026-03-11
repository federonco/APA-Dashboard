"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  crew: string;
  userEmail: string;
  availableCrews: string[];
}

export function Header({ crew, userEmail, availableCrews }: Props) {
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const view = searchParams.get("view") ?? "dashboard";
  const isSpreadsheet = view === "spreadsheet";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  const toggleViewUrl = `/?crew=${crew}&view=${isSpreadsheet ? "dashboard" : "spreadsheet"}`;

  return (
    <header className="sticky top-0 z-40 border-b border-[#1e1e1e] bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="font-barlow text-2xl font-bold uppercase text-white">
            Alkimos Pipeline Alliance
          </h1>
          <p className="text-sm text-[#999]">DN1600 Trunk Main</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs uppercase text-[#999]">Logged in as</p>
            <p className="font-mono text-sm text-white">{userEmail}</p>
          </div>

          <a
            href={toggleViewUrl}
            className="rounded-lg border border-[#1e1e1e] bg-[#1a1a1a] px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition hover:border-[#f97316]"
          >
            📊 {isSpreadsheet ? "Dashboard" : "Data View"}
          </a>

          {userEmail === "ronco.fe@gmail.com" && (
            <a
              href="/admin/control-panel"
              className="rounded-lg bg-[#f97316] px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition hover:bg-[#e67e1f]"
            >
              ⚙️ Admin
            </a>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg border border-red-900 bg-red-900/20 px-4 py-2 font-barlow text-sm font-bold uppercase text-red-400 transition disabled:opacity-50 hover:bg-red-900/40"
          >
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}
