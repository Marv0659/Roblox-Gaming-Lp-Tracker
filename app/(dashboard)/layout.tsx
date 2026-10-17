import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/db";
import { formatShortDate, formatTime } from "@/lib/utils";

async function getLastSyncLabel(): Promise<string> {
  const [lastSync, players] = await Promise.all([
    prisma.syncLog
      .findFirst({ where: { ok: true }, orderBy: { startedAt: "desc" }, select: { startedAt: true } })
      .catch(() => null),
    prisma.trackedPlayer.count(),
  ]);
  const playersLabel = `${players} player${players === 1 ? "" : "s"}`;
  if (!lastSync) return `Not synced yet · ${playersLabel}`;
  const at = lastSync.startedAt;
  const today = formatShortDate(new Date()) === formatShortDate(at);
  return `Last sync ${today ? formatTime(at) : `${formatShortDate(at)} ${formatTime(at)}`} · ${playersLabel}`;
}

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const lastSyncLabel = await getLastSyncLabel();
  return <DashboardShell lastSyncLabel={lastSyncLabel}>{children}</DashboardShell>;
}
