"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Award,
  Flame,
  Home,
  Settings,
  ShieldCheck,
  Skull,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Leaderboard", icon: Home },
  { href: "/players", label: "Players", icon: UserRound },
  { href: "/duos", label: "Duos", icon: Users },
  { href: "/recap", label: "Weekly recap", icon: TrendingUp },
  { href: "/session-recap", label: "Session recap", icon: Flame },
  { href: "/hall-of-fame", label: "Hall of fame", icon: Award },
  { href: "/hall-of-shame", label: "Hall of shame", icon: Skull },
  { href: "/champion-trust", label: "Champion trust", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
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
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              onClick={onClose}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
