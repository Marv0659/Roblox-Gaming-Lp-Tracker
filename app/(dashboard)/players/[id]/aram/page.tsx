import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPlayerChallengeData } from "@/lib/riot/challenges";
import {
  getAramChallengeProgress,
  groupAramProgress,
  tierColorClass,
  TIER_ORDER,
  type AramChallengeProgress,
} from "@/lib/aram-challenges";
import { ViewSwitcher } from "../view-switcher";
import { SyncButton } from "../sync-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// ─── Progress bar component ───────────────────────────────────────────────────

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Individual challenge row ─────────────────────────────────────────────────

function ChallengeRow({ progress }: { progress: AramChallengeProgress }) {
  const { definition, value, level, completed, nextThreshold, tierIndex } = progress;
  const tierLabel = level === "NONE" ? "Not started" : level;

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{definition.name}</p>
          <p className="text-xs text-muted-foreground">{definition.description}</p>
        </div>
        <Badge
          variant={completed ? "default" : "secondary"}
          className={cn(
            "shrink-0 font-normal uppercase text-xs",
            completed && "bg-purple-500/90 text-white hover:bg-purple-500"
          )}
        >
          {tierLabel}
        </Badge>
      </div>

      {!completed && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {value.toLocaleString()}
              {nextThreshold != null ? ` / ${nextThreshold.toLocaleString()}` : ""}
            </span>
            <span>
              Next: {TIER_ORDER[tierIndex + 1] ?? "MAX"}
            </span>
          </div>
          <ProgressBar
            value={value}
            max={nextThreshold ?? value}
          />
        </div>
      )}

      {completed && (
        <p className="text-xs text-purple-400">
          ✓ Completed — {value.toLocaleString()} total
        </p>
      )}
    </li>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({
  title,
  groupProgress,
  challenges,
}: {
  title: string;
  groupProgress: AramChallengeProgress | null;
  challenges: AramChallengeProgress[];
}) {
  const completedCount = challenges.filter((c) => c.completed).length;
  const totalCount = challenges.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{title}</h3>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} completed
          </span>
        </div>
        {groupProgress && (
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-medium", tierColorClass(groupProgress.level))}>
              {groupProgress.level === "NONE" ? "No progress" : groupProgress.level}
            </span>
            <span className="text-xs text-muted-foreground">
              {groupProgress.value.toLocaleString()} pts
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {challenges.map((c) => (
            <ChallengeRow key={c.definition.id} progress={c} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const player = await prisma.trackedPlayer.findUnique({
    where: { id },
    select: { id: true, gameName: true, tagLine: true, region: true, puuid: true },
  });
  if (!player) notFound();

  // Fetch live from Riot challenges-v1 — null if player has no data or API error
  const challengeData = await getPlayerChallengeData(player.region, player.puuid);
  const allProgress = getAramChallengeProgress(challengeData);
  const { authority, warriorGroup, finesseGroup, championGroup, warrior, finesse, champion } =
    groupAramProgress(allProgress);

  const hasAnyData = challengeData !== null;
  const godUnlocked = authority?.completed ?? false;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" asChild>
            <Link href="/players">← Players</Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl">
            {player.gameName}
            <span className="font-normal text-muted-foreground">#{player.tagLine}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ViewSwitcher playerId={player.id} />
          <SyncButton playerId={player.id} />
        </div>
      </div>

      {/* ARAM God title banner */}
      <div
        className={cn(
          "mb-6 relative overflow-hidden rounded-xl border px-5 py-5 sm:py-6",
          godUnlocked
            ? "border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 shadow-[0_0_30px_-5px_var(--color-yellow-500)]"
            : "border-border bg-muted/20"
        )}
      >
        {godUnlocked && (
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl animate-pulse" />
        )}
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h2 className={cn("text-lg font-bold tracking-tight", godUnlocked ? "text-yellow-500 sm:text-2xl" : "text-foreground")}>
                {godUnlocked ? "👑 ARAM GOD" : "ARAM God Title Progress"}
              </h2>
              {godUnlocked && (
                <Badge className="bg-yellow-500 text-black hover:bg-yellow-400">UNLOCKED</Badge>
              )}
            </div>
            <p className={cn("text-sm", godUnlocked ? "text-yellow-500/80 font-medium" : "text-muted-foreground")}>
              {godUnlocked
                ? `${player.gameName} has achieved the legendary ARAM God title.`
                : "Reach MASTER in ARAM Authority to unlock the ARAM God title."}
            </p>
          </div>
          {authority && (
            <div className="mt-2 sm:mt-0 text-right">
              <span className={cn("text-xl font-bold", tierColorClass(authority.level))}>
                {authority.level === "NONE" ? "Unranked" : authority.level}
              </span>
              <p className="text-xs text-muted-foreground">
                {authority.value.toLocaleString()} pts
                {authority.nextThreshold != null &&
                  ` / ${authority.nextThreshold.toLocaleString()} for ${TIER_ORDER[authority.tierIndex + 1]}`}
              </p>
              {authority.nextThreshold != null && (
                <ProgressBar
                  className="mt-1 w-32"
                  value={authority.value}
                  max={authority.nextThreshold}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* No data fallback */}
      {!hasAnyData && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No challenge data found for this player.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Challenge data is fetched live from Riot. The player may not have started any ARAM
              challenges yet, or the API key may not have the{" "}
              <code className="text-xs">lol-challenges-v1</code> permission.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Challenge group cards */}
      {hasAnyData && (
        <div className="grid gap-6 md:grid-cols-3">
          <GroupCard
            title="⚔️ ARAM Warrior"
            groupProgress={warriorGroup}
            challenges={warrior}
          />
          <GroupCard
            title="🎯 ARAM Finesse"
            groupProgress={finesseGroup}
            challenges={finesse}
          />
          <GroupCard
            title="🏅 ARAM Champion"
            groupProgress={championGroup}
            challenges={champion}
          />
        </div>
      )}
    </div>
  );
}
