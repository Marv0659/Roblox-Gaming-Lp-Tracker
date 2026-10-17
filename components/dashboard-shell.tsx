"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo, MobileTabBar, Sidebar } from "@/components/sidebar";
import { SyncAllButton } from "@/app/(dashboard)/players/sync-all-button";

export function DashboardShell({
  children,
  lastSyncLabel,
}: {
  children: React.ReactNode;
  lastSyncLabel: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        lastSyncLabel={lastSyncLabel}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-15 shrink-0 items-center justify-between border-b border-sidebar-border bg-background px-4 md:hidden">
          <Link href="/dashboard" className="text-foreground">
            <Logo />
          </Link>
          <SyncAllButton compact />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>
      </div>
      <MobileTabBar onMore={() => setMobileMenuOpen(true)} />
    </div>
  );
}
