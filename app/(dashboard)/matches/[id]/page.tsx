import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/leaderboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function queueLabel(queueId: number): string {
  const map: Record<number, string> = {
    420: "Ranked Solo / Duo",
    440: "Ranked Flex 5v5",
  };
  return map[queueId] ?? `Queue ${queueId}`;
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getMatchDetail(id);
  if (!match) notFound();

  const durationMin = Math.floor(match.gameDuration / 60);
  const durationSec = match.gameDuration % 60;
  const isRematch = match.gameDuration < 210;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" asChild>
          <Link href="/dashboard">← Dashboard</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Match details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(match.gameStartAt).toLocaleString()} · {durationMin}:{durationSec.toString().padStart(2, "0")} ·{" "}
          {queueLabel(match.queueId)}
        </p>
        <Badge variant="secondary" className="mt-2 font-mono text-xs">
          {match.riotMatchId}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Tracked players in this match</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 pr-4">Player</th>
                  <th className="pb-2 pr-4">Champion</th>
                  <th className="pb-2 pr-4">K/D/A</th>
                  <th className="pb-2 pr-4">Result</th>
                  <th className="pb-2 pr-4">CS</th>
                  <th className="pb-2 pr-4">Gold</th>
                  <th className="pb-2 pr-4">Damage</th>
                  <th className="pb-2">Vision</th>
                </tr>
              </thead>
              <tbody>
                {match.participants.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border text-muted-foreground last:border-b-0"
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={`/players/${p.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {p.gameName}#{p.tagLine}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 font-medium text-foreground">
                      {p.championName ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {p.kills}/{p.deaths}/{p.assists}
                    </td>
                    <td className="py-2 pr-4">
                      {isRematch ? (
                        <span className="text-muted-foreground">Remake</span>
                      ) : (
                        <span className={p.win ? "text-emerald-500" : "text-destructive"}>
                          {p.win ? "Win" : "Loss"}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{p.cs}</td>
                    <td className="py-2 pr-4">{p.gold.toLocaleString()}</td>
                    <td className="py-2 pr-4">{p.damageDealt.toLocaleString()}</td>
                    <td className="py-2">{p.visionScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
