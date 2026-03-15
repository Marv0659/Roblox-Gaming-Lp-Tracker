"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SOLO_QUEUE, FLEX_QUEUE, QUEUE_OPTIONS } from "@/lib/leaderboard";

interface LeaderboardFiltersProps {
  regions: string[];
}

export function LeaderboardFilters({ regions }: LeaderboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const region = searchParams.get("region") ?? "all";
  const queue = searchParams.get("queue") ?? SOLO_QUEUE;

  function setRegion(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("region");
    else next.set("region", value);
    router.push(`/dashboard?${next.toString()}`);
  }

  function setQueue(value: string) {
    const next = new URLSearchParams(searchParams);
    next.set("queue", value);
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label title="Filter by server (e.g. EUW, NA). Leave as All to show every region.">Region</Label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label title="Solo/Duo = ranked solo queue; Flex 5v5 = ranked flex.">Queue</Label>
        <Select value={queue} onValueChange={setQueue}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUEUE_OPTIONS.map((q) => (
              <SelectItem key={q.value} value={q.value}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
