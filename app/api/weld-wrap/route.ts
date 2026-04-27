import { NextResponse } from "next/server";
import { requireAdminClient } from "@/lib/supabase/admin";

type WeldWrapResponse = {
  weld: { done: number; total: number };
  wrap: { done: number; total: number };
};

function emptyResponse(): WeldWrapResponse {
  return {
    weld: { done: 0, total: 0 },
    wrap: { done: 0, total: 0 },
  };
}

export async function GET() {
  const admin = requireAdminClient();

  try {
    const { data, error } = await admin
      .from("drainer_pipe_records")
      .select(
        "joint_type,welded_at,wrapped_at,weld_step_e1_at,weld_step_e2_at,weld_step_i1_at,weld_step_i2_at"
      )
      .in("joint_type", ["WR", "WB"]);

    if (error) throw error;

    const rows = data ?? [];
    const total = rows.length;
    const welded = rows.filter((row) => {
      if (row.joint_type === "WR") return !!row.welded_at;
      if (row.joint_type === "WB") {
        return (
          !!row.weld_step_e1_at &&
          !!row.weld_step_e2_at &&
          !!row.weld_step_i1_at &&
          !!row.weld_step_i2_at
        );
      }
      return false;
    }).length;
    const wrapped = rows.filter((row) => !!row.wrapped_at).length;

    return NextResponse.json({
      weld: { done: welded, total },
      wrap: { done: wrapped, total },
    } satisfies WeldWrapResponse);
  } catch {
    // Fallback for environments that persist WB progress in welded_steps JSON.
    const { data, error } = await admin
      .from("drainer_pipe_records")
      .select("joint_type,welded_at,wrapped_at,welded_steps")
      .in("joint_type", ["WR", "WB"]);

    if (error) {
      return NextResponse.json(
        { ...emptyResponse(), error: error.message },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as Array<{
      joint_type: string | null;
      welded_at: string | null;
      wrapped_at: string | null;
      welded_steps?: {
        external_1?: string | null;
        external_2?: string | null;
        internal_1?: string | null;
        internal_2?: string | null;
      } | null;
    }>;

    const total = rows.length;
    const welded = rows.filter((row) => {
      if (row.joint_type === "WR") return !!row.welded_at;
      if (row.joint_type === "WB") {
        const steps = row.welded_steps;
        if (steps) {
          return (
            !!steps.external_1 &&
            !!steps.external_2 &&
            !!steps.internal_1 &&
            !!steps.internal_2
          );
        }
        return !!row.welded_at;
      }
      return false;
    }).length;
    const wrapped = rows.filter((row) => !!row.wrapped_at).length;

    return NextResponse.json({
      weld: { done: welded, total },
      wrap: { done: wrapped, total },
    } satisfies WeldWrapResponse);
  }
}
