import { NextResponse } from "next/server";
import { getSpreadsheetData } from "@/lib/queries/spreadsheet";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const crew = searchParams.get("crew") ?? "A";
    const date = searchParams.get("date") ?? undefined;
    const data = await getSpreadsheetData(crew, date || undefined, ["w"]);
    return NextResponse.json({ onsiteW: data.onsiteW, isMock: data.mockFlags?.w });
  } catch (err) {
    console.error("[API] spreadsheet/water:", err);
    return NextResponse.json(
      { error: "Failed to fetch water data" },
      { status: 500 }
    );
  }
}
