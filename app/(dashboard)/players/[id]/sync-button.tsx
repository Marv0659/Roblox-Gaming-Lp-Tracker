"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { syncTrackedPlayer } from "@/app/actions/players";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncButton({ playerId }: { playerId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setPending(true);
    const result = await syncTrackedPlayer(playerId);
    setPending(false);
    router.refresh();
    if (result.ok) {
      if (result.skippedDueToLock) {
        toast.message("Sync already in progress for this player.");
        return;
      }
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
    <Button
      type="button"
      onClick={handleSync}
      disabled={pending}
      className="h-11 bg-brand px-5 font-semibold text-[#15181d] hover:bg-brand/90"
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
      {pending ? "Syncing…" : "Sync now"}
    </Button>
  );
}
