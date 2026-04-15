import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAggregatedSectionProgress, getCrewId, type SectionProgressScope } from "@/lib/queries/daily";

export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: { scopes?: SectionProgressScope[]; crewCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scopes = body.scopes;
  const crewCode = body.crewCode?.trim();
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return NextResponse.json({ error: "scopes required" }, { status: 400 });
  }

  if (crewCode) {
    const resolvedCrew = crewCode === "Global" ? "A" : crewCode;
    const crewId = await getCrewId(resolvedCrew);
    if (!crewId) {
      return NextResponse.json({ error: "Invalid crew" }, { status: 400 });
    }
    for (const s of scopes) {
      const { data: row } = await admin
        .from("drainer_sections")
        .select("crew_id")
        .eq("id", s.sectionId)
        .maybeSingle();
      if (!row || (row as { crew_id?: string | null }).crew_id !== crewId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const progress = await getAggregatedSectionProgress(scopes);
  return NextResponse.json({ progress });
}
