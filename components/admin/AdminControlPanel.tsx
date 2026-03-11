"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminList from "./AdminList";
import AdminForm from "./AdminForm";
import AdminDetails from "./AdminDetails";

interface Props {
  superadminEmail: string;
}

export default function AdminControlPanel({ superadminEmail }: Props) {
  const [admins, setAdmins] = useState<Record<string, unknown>[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<Record<string, unknown> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      const { data } = await supabase
        .from("psp_admins")
        .select("*")
        .order("created_at", { ascending: false });
      setAdmins((data as Record<string, unknown>[]) ?? []);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center text-[#666]">
        <p>Loading admins...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="md:col-span-1">
        <button
          onClick={() => {
            setSelectedAdmin(null);
            setShowForm(true);
          }}
          className="hover:bg-[#e67e1f] mb-4 w-full rounded-lg bg-[#f97316] px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition"
        >
          + Create Admin
        </button>
        <AdminList
          admins={admins}
          selectedAdmin={selectedAdmin}
          onSelect={(admin) => {
            setSelectedAdmin(admin);
            setShowForm(false);
          }}
        />
      </div>

      <div className="md:col-span-2">
        {showForm ? (
          <AdminForm
            admin={selectedAdmin}
            onSave={() => {
              fetchAdmins();
              setShowForm(false);
              setSelectedAdmin(null);
            }}
            onCancel={() => setShowForm(false)}
            superadminEmail={superadminEmail}
          />
        ) : selectedAdmin ? (
          <AdminDetails
            admin={selectedAdmin}
            onEdit={() => setShowForm(true)}
            onDeleted={() => {
              fetchAdmins();
              setSelectedAdmin(null);
            }}
            superadminEmail={superadminEmail}
          />
        ) : (
          <div className="rounded-lg border border-[#1e1e1e] bg-[#0e0e0e] p-6 text-center text-[#666]">
            Select an admin to view or create a new one
          </div>
        )}
      </div>
    </div>
  );
}
