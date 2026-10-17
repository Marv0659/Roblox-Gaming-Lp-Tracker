"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ViewSwitcherProps {
  playerId: string;
}

export function ViewSwitcher({ playerId }: ViewSwitcherProps) {
  const pathname = usePathname();
  const isAram = pathname.endsWith("/aram");

  return (
    <nav aria-label="Player view" className="flex items-center gap-1 rounded-[10px] border border-border bg-card p-1 text-sm">
      <Link
        href={`/players/${playerId}`}
        className={cn(
          "flex min-h-9 items-center rounded-[7px] px-3.5 transition-colors",
          !isAram
            ? "bg-foreground font-semibold text-background"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Ranked
      </Link>
      <Link
        href={`/players/${playerId}/aram`}
        className={cn(
          "flex min-h-9 items-center rounded-[7px] px-3.5 transition-colors",
          isAram
            ? "bg-foreground font-semibold text-background"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        ARAM
      </Link>
    </nav>
  );
}
