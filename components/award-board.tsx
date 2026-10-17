/**
 * Category cards for the Hall of fame / Hall of shame pages: the leader up top in display type,
 * runners-up as a short ranked list underneath.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Eyebrow, Panel } from "@/components/lol";

export type AwardEntry = {
  player: { id: string; gameName: string; tagLine: string };
  value: number;
  label: string;
  detail?: string;
};

export type AwardTone = "win" | "loss" | "brand";

const TONE: Record<AwardTone, string> = {
  win: "text-win",
  loss: "text-loss",
  brand: "text-brand",
};

export function AwardCategory({
  title,
  subtitle,
  entries,
  emptyMessage,
  tone,
}: {
  title: string;
  subtitle: string;
  entries: AwardEntry[];
  emptyMessage: string;
  tone: AwardTone;
}) {
  const [leader, ...rest] = entries.slice(0, 5);
  return (
    <Panel className="flex min-w-0 flex-col gap-3 p-5">
      <div className="flex flex-col gap-0.5">
        <Eyebrow className={TONE[tone]}>{title}</Eyebrow>
        <p className="text-xs text-faint">{subtitle}</p>
      </div>
      {!leader ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <Link href={`/players/${leader.player.id}`} className="truncate text-[17px] font-semibold hover:underline">
              {leader.player.gameName} <span className="font-medium text-faint">#{leader.player.tagLine}</span>
            </Link>
            <span className={cn("font-display text-3xl font-bold leading-none tabular-nums", TONE[tone])}>
              {leader.label}
            </span>
            {leader.detail && <span className="text-xs text-muted-foreground">{leader.detail}</span>}
          </div>
          {rest.length > 0 && (
            <ol className="flex flex-col border-t border-border pt-2" start={2}>
              {rest.map((e, i) => (
                <li key={e.player.id} className="flex min-h-9 items-center gap-3 py-1 text-sm">
                  <span className="w-4 shrink-0 font-display font-bold text-faint">{i + 2}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Link href={`/players/${e.player.id}`} className="truncate font-medium hover:underline">
                      {e.player.gameName}
                    </Link>
                    {e.detail && <span className="truncate text-xs text-faint">{e.detail}</span>}
                  </span>
                  <span className="shrink-0 text-right tabular-nums text-muted-foreground">{e.label}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Panel>
  );
}
