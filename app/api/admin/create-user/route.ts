import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/supabase-auth";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email || session.user.email !== "ronco.fe@gmail.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, fullName, crews, region } = body as {
    email: string;
    password: string;
    fullName?: string;
    crews?: string[];
    region?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password required" },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: dbError } = await supabaseAdmin.from("psp_admins").insert({
    email,
    full_name: fullName ?? null,
    role: "admin",
    crews: crews ?? [],
    region: region ?? null,
    is_active: true,
    user_id: authData.user?.id ?? null,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
