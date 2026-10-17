import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";
import { Panel, SectionTitle } from "@/components/lol";

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

function duration(start: Date, end: Date | null): string {
  if (!end) return "—";
  const s = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export default async function SettingsPage() {
  const logs = await getRecentSyncLogs();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide md:text-[44px]">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Leaderboard and tracking for your group. Add players by Riot ID and region; sync to fetch ranks and matches.
        </p>
      </header>

      <Panel aria-label="Recent syncs" className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <SectionTitle>Recent syncs</SectionTitle>
        </div>
        {logs === null ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Sync log table missing. Run <code className="text-foreground">prisma migrate deploy</code>.
          </p>
        ) : logs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No syncs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.1em] text-faint">
                  <th scope="col" className="px-5 py-3 font-semibold">When</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Trigger</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Result</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Players</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Matches</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Took</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#1e2228] align-top last:border-b-0">
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDate(log.startedAt)} <span className="text-faint">{formatTime(log.startedAt)}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{TRIGGER_LABELS[log.trigger] ?? log.trigger}</td>
                    <td className="px-3 py-3">
                      {log.ok ? (
                        <span className="inline-flex rounded-md bg-win-soft px-2 py-0.5 text-xs font-bold text-win">OK</span>
                      ) : (
                        <span className="flex flex-col gap-1" title={log.error ?? undefined}>
                          <span className="inline-flex self-start rounded-md bg-loss-soft px-2 py-0.5 text-xs font-bold text-loss">
                            Failed
                          </span>
                          {log.error && (
                            <span className="max-w-[320px] text-xs text-faint">{log.error.split("\n")[0].slice(0, 80)}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{log.playersSynced}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{log.matchesAdded}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-faint">{duration(log.startedAt, log.finishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
