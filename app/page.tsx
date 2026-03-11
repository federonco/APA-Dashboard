import {
  getTodayPipeProgress,
  getTodayBackfillProgress,
  getTodayWaterByActivity,
  getLast5DaysPipes,
  getLast5DaysBackfill,
} from "@/lib/queries/daily";
import { getSpreadsheetData } from "@/lib/queries/spreadsheet";
import { getServerSession, getAdminCrews, getUserRole } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/dashboard/Header";
import { NavTabs } from "@/components/dashboard/NavTabs";
import { KPISummary } from "@/components/dashboard/KPISummary";
import { ProjectProgress } from "@/components/dashboard/ProjectProgress";
import { DailyView } from "@/components/dashboard/DailyView";
import { UnifiedHistoricTrend } from "@/components/dashboard/UnifiedHistoricTrend";
import { SpreadsheetMode } from "@/components/dashboard/SpreadsheetMode";
import { Footer } from "@/components/dashboard/Footer";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = {
  title: "Alkimos Pipeline Alliance - DN1600 Dashboard",
};

export default async function Page({ searchParams }: Props) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const userRole = await getUserRole(session.user.email!);
  const userCrews =
    userRole === "superadmin"
      ? ["A", "B", "C", "D", "Global"]
      : await getAdminCrews(session.user.email!);

  const params = await searchParams;
  const crew = (params?.crew as string) || "A";
  const view = (params?.view as string) || "dashboard";

  if (userRole === "admin" && !userCrews.includes(crew)) {
    redirect(`/?crew=${userCrews[0] || "A"}`);
  }

  const [
    pipeProgress,
    backfillProgress,
    waterByActivity,
    last5Pipes,
    last5Backfill,
  ] = await Promise.all([
    getTodayPipeProgress(),
    getTodayBackfillProgress(),
    getTodayWaterByActivity(),
    getLast5DaysPipes(),
    getLast5DaysBackfill(),
  ]);

  const spreadsheetData =
    view === "spreadsheet"
      ? await getSpreadsheetData(crew === "Global" ? null : crew)
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#080808]">
      <Header
        crew={crew}
        userEmail={session.user.email!}
        availableCrews={userCrews}
      />
      <NavTabs crew={crew} view={view} />

      <main className="flex-1 px-6 py-6">
        {view === "spreadsheet" && spreadsheetData ? (
          <SpreadsheetMode
            data={spreadsheetData}
            crew={
              crew === "Global"
                ? ("global" as const)
                : (crew as "A" | "B" | "C" | "D")
            }
          />
        ) : (
          <>
            <KPISummary />
            <ProjectProgress />
            <DailyView
              pipeProgress={pipeProgress}
              backfillProgress={backfillProgress}
              waterByActivity={waterByActivity}
              last5Pipes={last5Pipes}
              last5Backfill={last5Backfill}
            />
            <div className="mt-6">
              <UnifiedHistoricTrend
                pipesMetresData={last5Pipes}
                backfillData={last5Backfill}
              />
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
