import { getSectionByToken } from "@/lib/queries/qrAccess";
import { notFound } from "next/navigation";
import { UserPanel } from "./UserPanel";

export default async function LocationAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const access = await getSectionByToken(token);

  if (!access) notFound();

  return (
    <div className="min-h-screen bg-[#080808]">
      <header className="border-b border-[#1e1e1e] px-6 py-4">
        <h1 className="text-xl font-semibold text-white">
          {access.type === "psp"
            ? `${access.location.name} — ${access.section.name}`
            : access.section.name}
        </h1>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">
          User Access · Read & Record
        </p>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-8">
        <UserPanel access={access} token={token} />
      </main>
    </div>
  );
}
