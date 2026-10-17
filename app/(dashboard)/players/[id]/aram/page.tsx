import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPlayerChallengeData } from "@/lib/riot/challenges";
import {
  getAramChallengeProgress,
  groupAramProgress,
  TIER_ORDER,
  type AramChallengeProgress,
} from "@/lib/aram-challenges";
import { tierColor, tierHex } from "@/lib/tier-colors";
import { cn, formatNumber } from "@/lib/utils";
import { Eyebrow, Panel, SectionTitle, TierEmblem } from "@/components/lol";
import { ViewSwitcher } from "../view-switcher";
import { SyncButton } from "../sync-button";

export const dynamic = "force-dynamic";

function pretty(level: string): string {
  return level === "NONE" ? "Not started" : level.charAt(0) + level.slice(1).toLowerCase();
}

function nextTier(p: AramChallengeProgress): string {
  const next = TIER_ORDER[p.tierIndex + 1];
  return next ? pretty(next) : "Max";
}

function ProgressBar({ value, max, tier, className }: { value: number; max: number; tier: string; className?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-border", className)}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tier === "NONE" ? "#7d8590" : tierHex(tier) }} />
    </div>
  );
}

function ChallengeRow({ progress }: { progress: AramChallengeProgress }) {
  const { definition, value, level, completed, nextThreshold } = progress;

  return (
    <li className="flex flex-col gap-2 border-b border-[#1e2228] py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">{definition.name}</span>
          <span className="text-xs text-faint">{definition.description}</span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
            completed ? "bg-brand/15 text-brand" : level === "NONE" ? "bg-surface-2 text-faint" : cn("bg-surface-2", tierColor(level))
          )}
        >
          {completed ? "Done" : pretty(level)}
        </span>
      </div>
      {completed ? (
        <span className="text-xs text-muted-foreground">{formatNumber(value)} total · maxed out</span>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
            <span>
              {formatNumber(value)}
              {nextThreshold != null && <span className="text-faint"> / {formatNumber(nextThreshold)}</span>}
            </span>
            <span className="text-faint">Next: {nextTier(progress)}</span>
          </div>
          <ProgressBar value={value} max={nextThreshold ?? value} tier={level} />
        </div>
      )}
    </li>
  );
}

function GroupPanel({
  title,
  groupProgress,
  challenges,
}: {
  title: string;
  groupProgress: AramChallengeProgress | null;
  challenges: AramChallengeProgress[];
}) {
  const completedCount = challenges.filter((c) => c.completed).length;

  return (
    <Panel aria-label={title} className="flex min-w-0 flex-col gap-2 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <SectionTitle>{title}</SectionTitle>
        <span className="text-xs text-faint tabular-nums">
          {completedCount}/{challenges.length} done
        </span>
      </div>
      {groupProgress && (
        <div className="flex items-center gap-3">
          <TierEmblem tier={groupProgress.level === "NONE" ? null : groupProgress.level} size={28} />
          <span className={cn("font-display text-xl font-bold", tierColor(groupProgress.level))}>
            {pretty(groupProgress.level)}
          </span>
          <span className="text-xs text-faint tabular-nums">{formatNumber(groupProgress.value)} pts</span>
        </div>
      )}
      <ul className="flex flex-col">
        {challenges.map((c) => (
          <ChallengeRow key={c.definition.id} progress={c} />
        ))}
      </ul>
    </Panel>
  );
}

export default async function AramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const player = await prisma.trackedPlayer.findUnique({
    where: { id },
    select: { id: true, gameName: true, tagLine: true, region: true, puuid: true },
  });
  if (!player) notFound();

  // Fetched live from Riot challenges-v1; null if the player has no data or the API errors.
  const challengeData = await getPlayerChallengeData(player.region, player.puuid);
  const allProgress = getAramChallengeProgress(challengeData);
  const { authority, warriorGroup, finesseGroup, championGroup, warrior, finesse, champion } =
    groupAramProgress(allProgress);

  const hasAnyData = challengeData !== null;
  const godUnlocked = authority?.completed ?? false;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <Link href={`/players/${player.id}`} className="text-[13px] text-muted-foreground hover:text-foreground">
        ← {player.gameName}
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Eyebrow>ARAM challenges</Eyebrow>
          <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-wide break-words md:text-[44px]">
            {player.gameName} <span className="font-semibold text-faint">#{player.tagLine}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SyncButton playerId={player.id} />
          <ViewSwitcher playerId={player.id} />
        </div>
      </header>

      <Panel
        aria-label="ARAM God title"
        className={cn("flex flex-wrap items-center justify-between gap-5 p-5 md:p-6", godUnlocked && "border-brand/60")}
      >
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <Eyebrow className={godUnlocked ? "text-brand" : undefined}>
            {godUnlocked ? "Title unlocked" : "Title progress"}
          </Eyebrow>
          <span className={cn("font-display text-3xl font-bold uppercase leading-none", godUnlocked ? "text-brand" : "text-foreground")}>
            ARAM God
          </span>
          <p className="text-sm text-muted-foreground">
            {godUnlocked
              ? `${player.gameName} holds the ARAM God title.`
              : "Reach Master in ARAM Authority to unlock the ARAM God title."}
          </p>
        </div>
        {authority && (
          <div className="flex min-w-0 flex-[1_1_240px] items-center gap-4 rounded-xl bg-surface-2 p-4">
            <TierEmblem tier={authority.level === "NONE" ? null : authority.level} size={48} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Eyebrow>ARAM Authority</Eyebrow>
              <span className={cn("font-display text-2xl font-bold leading-none", tierColor(authority.level))}>
                {pretty(authority.level)}
              </span>
              {authority.nextThreshold != null && (
                <ProgressBar value={authority.value} max={authority.nextThreshold} tier={authority.level} />
              )}
              <span className="text-xs text-faint tabular-nums">
                {formatNumber(authority.value)} pts
                {authority.nextThreshold != null &&
                  ` / ${formatNumber(authority.nextThreshold)} for ${nextTier(authority)}`}
              </span>
            </div>
          </div>
        )}
      </Panel>

      {!hasAnyData ? (
        <Panel className="border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          <p>No challenge data found for this player.</p>
          <p className="mt-1 text-xs text-faint">
            Challenge data comes live from Riot. The player may not have started any ARAM challenges, or the API key
            lacks the <code>lol-challenges-v1</code> permission.
          </p>
        </Panel>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
          <GroupPanel title="Warrior" groupProgress={warriorGroup} challenges={warrior} />
          <GroupPanel title="Finesse" groupProgress={finesseGroup} challenges={finesse} />
          <GroupPanel title="Champion" groupProgress={championGroup} challenges={champion} />
        </div>
      )}
    </div>
  );
}
