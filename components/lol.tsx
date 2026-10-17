/**
 * Small shared building blocks for the redesigned pages: tier emblem, champion icon,
 * last-games strip, win/loss bar, section headings and stat tiles.
 */
import { cn } from "@/lib/utils";
import { tierHex } from "@/lib/tier-colors";

export { prettyTier } from "@/lib/rank-utils";

const EMBLEM_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem";
const CHAMPION_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons";

/**
 * Riot's emblem PNGs carry a lot of transparent padding, so the image is drawn at ~4× the
 * box and overflows it visually; the box (`size` px) is what takes up layout space.
 */
export function TierEmblem({ tier, size = 28, className }: { tier: string | null | undefined; size?: number; className?: string }) {
  if (!tier) {
    return (
      <span
        aria-hidden
        style={{ width: size * 0.6, height: size * 0.6, margin: size * 0.2 }}
        className={cn("inline-block shrink-0 rotate-45 rounded-[3px] border-2 border-faint/60", className)}
      />
    );
  }
  return (
    <span aria-hidden className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${EMBLEM_BASE}/emblem-${tier.toLowerCase()}.png`}
        alt=""
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
        style={{ width: size * 4, height: size * 4 }}
      />
    </span>
  );
}

export function ChampionIcon({
  championId,
  championName,
  className,
}: {
  championId: number | null | undefined;
  championName: string | null | undefined;
  className?: string;
}) {
  if (!championId) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-input bg-surface-2 font-display text-sm font-bold text-muted-foreground",
          className
        )}
      >
        {(championName ?? "?").slice(0, 2)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${CHAMPION_ICON_BASE}/${championId}.png`}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      className={cn("size-10 shrink-0 rounded-lg border border-input bg-surface-2 object-cover", className)}
    />
  );
}

export type FormResult = "W" | "L" | "R";

/** Last games, oldest → newest left to right. `results` is newest first (as stored). */
export function FormStrip({
  results,
  variant = "letters",
}: {
  results: FormResult[];
  variant?: "letters" | "bars";
}) {
  const chrono = [...results].reverse();
  const label = chrono.length
    ? `Last ${chrono.length} games, oldest to newest: ${chrono.join(" ")}`
    : "No recent games";
  if (chrono.length === 0) {
    return <span className="text-xs text-faint">—</span>;
  }
  return (
    <span className="flex gap-1" role="img" aria-label={label}>
      {chrono.map((r, i) =>
        variant === "bars" ? (
          <span
            key={i}
            className={cn(
              "h-1.5 w-3.5 rounded-sm",
              r === "W" ? "bg-win-solid" : r === "L" ? "bg-loss-solid" : "bg-input"
            )}
          />
        ) : (
          <span
            key={i}
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-[5px] text-[11px] font-bold",
              r === "W" ? "bg-win-soft text-win" : r === "L" ? "bg-loss-soft text-loss" : "bg-surface-2 text-faint"
            )}
          >
            {r}
          </span>
        )
      )}
    </span>
  );
}

export function WinLossBar({ wins, losses }: { wins: number; losses: number }) {
  const games = wins + losses;
  const wr = games > 0 ? (wins / games) * 100 : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between gap-2 text-[13px]">
        <span className="text-muted-foreground">{games > 0 ? `${wins}W ${losses}L` : "No ranked games"}</span>
        <span className="font-semibold tabular-nums">{games > 0 ? `${wr.toFixed(1)}%` : "—"}</span>
      </div>
      <div className={cn("flex h-1 overflow-hidden rounded-full", games > 0 ? "bg-loss-solid" : "bg-input")}>
        <div className="h-1 bg-win-solid" style={{ width: `${wr}%` }} />
      </div>
    </div>
  );
}

/** LP within the current division as a thin bar (Master+ has no 100 LP cap). */
export function LpBar({ tier, lp, className }: { tier: string; lp: number; className?: string }) {
  const apex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier);
  const pct = apex ? 100 : Math.max(0, Math.min(100, lp));
  return (
    <div className={cn("h-1 rounded-full bg-border", className)}>
      <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: tierHex(tier) }} />
    </div>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-semibold uppercase tracking-[0.12em] text-faint", className)}>{children}</div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-display text-xl font-bold uppercase tracking-wide", className)}>{children}</h2>
  );
}

export function Panel({ children, className, ...rest }: React.ComponentProps<"section">) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", className)} {...rest}>
      {children}
    </section>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="font-display text-3xl font-bold leading-none tabular-nums">{value}</div>
      {sub != null && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function ResultPill({ win, remake }: { win: boolean; remake?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md px-2.5 py-0.5 text-xs font-bold",
        remake ? "bg-surface-2 text-faint" : win ? "bg-win-soft text-win" : "bg-loss-soft text-loss"
      )}
    >
      {remake ? "Remake" : win ? "Win" : "Loss"}
    </span>
  );
}
