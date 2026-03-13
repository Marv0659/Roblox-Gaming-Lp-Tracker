"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface Snapshot {
  leaguePoints: number;
  tier: string;
  rank: string;
  createdAt: Date;
}

const chartConfig = {
  lp: {
    label: "LP",
    color: "var(--chart-1)",
  },
  date: {
    label: "Date",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig;

interface LpHistoryChartProps {
  snapshots: Snapshot[];
}

export function LpHistoryChart({ snapshots }: LpHistoryChartProps) {
  const data = [...snapshots]
    .filter((s) => s.tier && s.leaguePoints !== undefined)
    .reverse()
    .map((s) => ({
      date: new Date(s.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      lp: s.leaguePoints,
      tierRank: `${s.tier} ${s.rank}`.trim(),
    }));

  if (data.length < 2) return null;

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <LineChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={["dataMin - 20", "dataMax + 20"]}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => [`${value} LP`, "LP"]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.tierRank ?? ""
              }
            />
          }
        />
        <Line
          type="monotone"
          dataKey="lp"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ fill: "var(--chart-1)", r: 3 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
