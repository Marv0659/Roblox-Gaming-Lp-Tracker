"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { syncAllPlayers } from "@/app/actions/players";
import { Button } from "@/components/ui/button";

export function SyncAllButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSyncAll() {
    setPending(true);
    const result = await syncAllPlayers();
    setPending(false);
    router.refresh();
    if (result.ok) {
      toast.success(
        `Synced ${result.playersSynced} player(s). ${result.totalMatchesAdded} new match(es) added.`
      );
    } else {
      const detail = result.errors?.length
        ? ` ${result.errors.slice(0, 3).join("; ")}${result.errors.length > 3 ? "…" : ""}`
        : "";
      toast.error(`${result.error}${detail}`);
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleSyncAll} disabled={pending}>
      {pending ? "Syncing all…" : "Sync all"}
    </Button>
  );
}
