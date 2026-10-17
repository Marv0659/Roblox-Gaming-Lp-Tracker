import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TRIGGER_LABELS: Record<string, string> = {
  CRON_ALL: "Cron (all)",
  CRON_STEP: "Cron (step)",
  MANUAL_ALL: "Sync all",
  MANUAL_PLAYER: "Player sync",
};

async function getRecentSyncLogs() {
  try {
    return await prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 20 });
  } catch {
    // Table not migrated yet.
    return null;
  }
}

export default async function SettingsPage() {
  const logs = await getRecentSyncLogs();

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="mb-6 text-xl font-bold tracking-tight sm:mb-8 sm:text-2xl">Settings</h1>

      <div className="flex flex-col gap-6">
        <Card className="max-w-xl">
          <CardHeader>
            <h2 className="text-lg font-semibold">About</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Leaderboard and tracking for your group. Add players by Riot ID and
              region; sync to fetch ranks and matches.
            </p>
          </CardContent>
        </Card>

        <Card className="max-w-3xl">
          <CardHeader>
            <h2 className="text-lg font-semibold">Recent syncs</h2>
          </CardHeader>
          <CardContent>
            {logs === null ? (
              <p className="text-sm text-muted-foreground">
                Sync log table missing — run <code>prisma migrate deploy</code>.
              </p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No syncs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2 pr-4">When</th>
                      <th className="pb-2 pr-4">Trigger</th>
                      <th className="pb-2 pr-4">Result</th>
                      <th className="pb-2 pr-4">Players</th>
                      <th className="pb-2">Matches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border align-top last:border-b-0">
                        <td className="py-2 pr-4 text-muted-foreground">{formatDateTime(log.startedAt)}</td>
                        <td className="py-2 pr-4">{TRIGGER_LABELS[log.trigger] ?? log.trigger}</td>
                        <td className="py-2 pr-4">
                          {log.ok ? (
                            <span className="text-emerald-500">OK</span>
                          ) : (
                            <span className="text-destructive" title={log.error ?? undefined}>
                              Failed{log.error ? `: ${log.error.split("\n")[0].slice(0, 80)}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">{log.playersSynced}</td>
                        <td className="py-2">{log.matchesAdded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
