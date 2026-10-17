"use client";

import { CartesianGrid, Line, LineChart, ReferenceDot, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ladderLpLabel, prettyTier, rankToLadderLp } from "@/lib/rank-utils";
import { formatShortDate } from "@/lib/utils";

interface Snapshot {
  leaguePoints: number;
  tier: string;
  rank: string;
  createdAt: Date;
}

const chartConfig = {
  ladder: { label: "LP", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface LpHistoryChartProps {
  /** Snapshots for one queue, newest first. */
  snapshots: Snapshot[];
}

/**
 * Rank over time on a continuous ladder (100 per division). Drawn as steps: we only know the
 * rank at each snapshot, not what happened between them.
 */
export function LpHistoryChart({ snapshots }: LpHistoryChartProps) {
  const data = [...snapshots]
    .filter((s) => s.tier)
    .reverse()
    .map((s) => ({
      t: new Date(s.createdAt).getTime(),
      ladder: rankToLadderLp(s),
      label: `${prettyTier(s.tier, s.rank)} · ${s.leaguePoints} LP`,
    }));

  if (data.length < 2) return null;

  const values = data.map((d) => d.ladder);
  const min = Math.floor((Math.min(...values) - 10) / 100) * 100;
  const max = Math.ceil((Math.max(...values) + 10) / 100) * 100;
  const ticks: number[] = [];
  for (let v = min; v <= max; v += 100) ticks.push(v);
  const peak = data.reduce((best, d) => (d.ladder > best.ladder ? d : best), data[0]);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border)" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t: number) => formatShortDate(new Date(t))}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={40}
        />
        <YAxis
          domain={[min, max]}
          ticks={ticks}
          tickFormatter={ladderLpLabel}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_, payload) => formatShortDate(new Date(payload?.[0]?.payload?.t ?? 0))}
              formatter={(_, __, item) => [(item?.payload as { label?: string })?.label ?? "", ""]}
            />
          }
        />
        <Line
          type="stepAfter"
          dataKey="ladder"
          stroke="var(--color-ladder)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <ReferenceDot x={peak.t} y={peak.ladder} r={5} fill="var(--brand)" stroke="none" />
      </LineChart>
    </ChartContainer>
  );
}
