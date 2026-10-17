"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { syncAllPlayers } from "@/app/actions/players";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncAllButton({
  className,
  compact = false,
}: {
  className?: string;
  /** Icon-only button (mobile header). */
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSyncAll() {
    setPending(true);
    const result = await syncAllPlayers();
    setPending(false);
    router.refresh();
    if (result.ok) {
      const skippedSuffix =
        result.playersSkipped > 0 ? ` ${result.playersSkipped} skipped (already syncing).` : "";
      toast.success(
        `Synced ${result.playersSynced} player(s). ${result.totalMatchesAdded} new match(es) added.${skippedSuffix}`
      );
    } else {
      const detail = result.errors?.length
        ? ` ${result.errors.slice(0, 3).join("; ")}${result.errors.length > 3 ? "…" : ""}`
        : "";
      toast.error(`${result.error}${detail}`);
    }
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={pending ? "Syncing all players" : "Sync all players"}
        onClick={handleSyncAll}
        disabled={pending}
        className={cn("size-11 text-brand", className)}
      >
        <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSyncAll}
      disabled={pending}
      className={cn("h-10 border-brand bg-transparent font-semibold text-brand hover:bg-brand/10 hover:text-brand", className)}
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
      {pending ? "Syncing…" : "Sync all"}
    </Button>
  );
}
