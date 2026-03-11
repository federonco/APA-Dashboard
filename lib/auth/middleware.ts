import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "./supabase-auth";

export async function checkAuth(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return { session };
}

export async function checkSuperadmin(request: NextRequest) {
  const session = await getServerSession();
  if (!session || session.user.email !== "ronco.fe@gmail.com") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return { session };
}
