import { createClient } from "@/lib/supabase/server";
import { buildQrUrl, generateQrToken } from "@/lib/qr";
import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table, id } = body as { table: "psp_sections" | "psp_locations" | "drainer_sections"; id: string };
    if (!table || !id) {
      return NextResponse.json({ error: "table and id required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = generateQrToken();
    const url = buildQrUrl(token);

    const updatePayload = {
      qr_token: token,
      qr_token_created_at: new Date().toISOString(),
    };

    if (table === "psp_sections") {
      const { error } = await supabase.from("psp_sections").update(updatePayload).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (table === "psp_locations") {
      const { error } = await supabase.from("psp_locations").update(updatePayload).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (table === "drainer_sections") {
      const { error } = await supabase.from("drainer_sections").update(updatePayload).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    const qrDataUrl = await QRCode.toDataURL(url, { width: 256 });

    return NextResponse.json({ token, url, qrDataUrl });
  } catch (err) {
    console.error("QR generate:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
