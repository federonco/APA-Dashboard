import { NextResponse } from "next/server";
import { getSpreadsheetData } from "@/lib/queries/spreadsheet";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const crew = searchParams.get("crew") ?? "A";
    const date = searchParams.get("date") ?? undefined;
    const data = await getSpreadsheetData(crew, date || undefined, ["b"]);
    return NextResponse.json({ onsiteB: data.onsiteB, isMock: data.mockFlags?.b });
  } catch (err) {
    console.error("[API] spreadsheet/backfill:", err);
    return NextResponse.json(
      { error: "Failed to fetch backfill data" },
      { status: 500 }
    );
  }
}
