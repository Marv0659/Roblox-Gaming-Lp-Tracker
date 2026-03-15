import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="mb-6 text-xl font-bold tracking-tight sm:mb-8 sm:text-2xl">Settings</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <h2 className="text-lg font-semibold">About</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Leaderboard and tracking for your group. Add players by Riot ID and
            region; sync to fetch ranks and matches.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
