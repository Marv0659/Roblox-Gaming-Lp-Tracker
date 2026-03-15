"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Leaderboard" },
  { href: "/players", label: "Players" },
  { href: "/duos", label: "Duos" },
  { href: "/recap", label: "Weekly recap" },
  { href: "/hall-of-shame", label: "Hall of shame" },
  { href: "/settings", label: "Settings" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out",
          "fixed inset-y-0 left-0 z-50 w-64 md:relative md:z-auto md:w-56 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-5">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-sidebar-foreground"
            onClick={onClose}
          >
            RobloxGamingTracker
          </Link>
          {onClose && (
            <button
              type="button"
              aria-label="Close menu"
              className="rounded p-2 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground md:hidden"
              onClick={onClose}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
