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
    <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5 text-sm">
      <Link
        href={`/players/${playerId}`}
        className={cn(
          "rounded px-3 py-1 transition-colors",
          !isAram
            ? "bg-background text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Solo/Duo
      </Link>
      <Link
        href={`/players/${playerId}/aram`}
        className={cn(
          "rounded px-3 py-1 transition-colors",
          isAram
            ? "bg-background text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        ARAM
      </Link>
    </div>
  );
}
