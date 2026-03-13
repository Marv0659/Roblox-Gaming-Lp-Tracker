"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { syncTrackedPlayer } from "@/app/actions/players";
import { Button } from "@/components/ui/button";

export function SyncButton({ playerId }: { playerId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setPending(true);
    const result = await syncTrackedPlayer(playerId);
    setPending(false);
    router.refresh();
    if (result.ok) {
      toast.success(
        result.matchesAdded > 0
          ? `Synced. ${result.matchesAdded} new match(es) added.`
          : "Synced."
      );
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Button type="button" onClick={handleSync} disabled={pending}>
      {pending ? "Syncing…" : "Sync now"}
    </Button>
  );
}
