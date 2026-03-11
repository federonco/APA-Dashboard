import { getServerSession } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Login - Alkimos Pipeline Alliance",
};

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-barlow mb-2 text-2xl font-bold uppercase text-white">
            Alkimos Pipeline Alliance
          </h1>
          <p className="text-sm text-[#999]">DN1600 Trunk Main Dashboard</p>
        </div>

        <div className="rounded-lg border border-[#1e1e1e] border-t-4 border-t-[#f97316] bg-[#0e0e0e] p-6">
          <h2 className="font-barlow mb-6 font-bold uppercase text-white">
            Sign In
          </h2>
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-[#666]">
          Contact administrator for access
        </p>
      </div>
    </div>
  );
}
