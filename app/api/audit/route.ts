import { NextRequest, NextResponse } from "next/server";
import { getServerSession, logAuditAction } from "@/lib/auth/supabase-auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.email !== "ronco.fe@gmail.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, targetEmail, details } = body as {
    action: string;
    targetEmail: string | null;
    details?: Record<string, unknown>;
  };
  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  await logAuditAction(
    session.user.email,
    action,
    targetEmail ?? null,
    details ?? {}
  );
  return NextResponse.json({ ok: true });
}
