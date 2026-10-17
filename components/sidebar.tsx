"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Menu, Trophy, UserRound, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { SyncAllButton } from "@/app/(dashboard)/players/sync-all-button";

type NavItem = { href: string; label: string };

export const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Leaderboard" },
      { href: "/players", label: "Players" },
      { href: "/duos", label: "Duos" },
    ],
  },
  {
    title: "Recaps",
    items: [
      { href: "/recap", label: "This week" },
      { href: "/session-recap", label: "Tonight’s session" },
      { href: "/ranked-wrapped", label: "Ranked Wrapped" },
    ],
  },
  {
    title: "Awards",
    items: [
      { href: "/hall-of-fame", label: "Hall of fame" },
      { href: "/hall-of-shame", label: "Hall of shame" },
      { href: "/champion-trust", label: "Champion trust" },
    ],
  },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/players") return pathname === "/players" || pathname.startsWith("/players/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden>
        <path d="M14 2 L26 14 L14 26 L2 14 Z" fill="none" stroke="var(--brand)" strokeWidth="2" />
        <path d="M14 8 L20 14 L14 20 L8 14 Z" fill="var(--brand)" />
      </svg>
      <span className="font-display text-[22px] font-bold uppercase tracking-wide">LP Tracker</span>
    </span>
  );
}

export interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  lastSyncLabel: string;
}

export function Sidebar({ mobileOpen = false, onClose, lastSyncLabel }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "flex h-full w-60 shrink-0 flex-col gap-7 overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-6 transition-transform duration-200 ease-out",
          "fixed inset-y-0 left-0 z-50 md:relative md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link href="/dashboard" className="px-2 text-sidebar-foreground" onClick={onClose}>
          <Logo />
        </Link>

        <nav aria-label="Main" className="flex flex-col gap-6">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-1">
              {group.title && (
                <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                        : "font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("size-1.5 rotate-45 rounded-[2px]", active ? "bg-brand" : "bg-input")}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2.5 rounded-xl border border-sidebar-border bg-card/60 p-3.5">
          <div className="text-xs text-muted-foreground">{lastSyncLabel}</div>
          <SyncAllButton className="w-full" />
          <Link
            href="/settings"
            onClick={onClose}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Settings &amp; sync log
          </Link>
        </div>
      </aside>
    </>
  );
}

const TABS = [
  { href: "/dashboard", label: "Board", icon: BarChart3, match: ["/dashboard"] },
  { href: "/players", label: "Players", icon: UserRound, match: ["/players", "/duos"] },
  { href: "/recap", label: "Recaps", icon: Activity, match: ["/recap", "/session-recap", "/ranked-wrapped"] },
  { href: "/hall-of-fame", label: "Awards", icon: Trophy, match: ["/hall-of-fame", "/hall-of-shame", "/champion-trust"] },
];

/** Phone-only bottom navigation. "More" opens the full sidebar. */
export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-sidebar-border bg-sidebar px-2 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match.some((m) => isActive(pathname, m));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 text-[11px]",
              active ? "font-semibold text-brand" : "text-muted-foreground"
            )}
          >
            <tab.icon className="size-5" aria-hidden />
            {tab.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className="flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
      >
        <Menu className="size-5" aria-hidden />
        More
      </button>
    </nav>
  );
}
