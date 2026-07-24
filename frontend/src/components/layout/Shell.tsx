"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { IconButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useMe } from "@/lib/queries";

import { isActivePath, MOBILE_NAV_ITEMS, NAV_ITEMS } from "./nav";

function Wordmark({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pasture-600 text-base font-black text-cream-50 shadow-soft">
        BG
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block text-[15px] font-bold leading-tight text-ink">Goat Farm</span>
          <span className="block text-xs leading-tight text-ink-faint">Herd &amp; ledger</span>
        </span>
      )}
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tap relative flex items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors duration-150",
              active
                ? "bg-pasture-100 text-pasture-800"
                : "text-ink-muted hover:bg-cream-200 hover:text-ink",
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock() {
  const { data: me } = useMe();
  const { signOut } = useAuth();
  const name = me?.display_name || me?.email || "Signed in";

  return (
    <div className="flex items-center gap-2.5 border-t border-cream-200 px-3 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-barn-100 text-sm font-bold text-barn-700">
        {initials(me?.display_name ?? me?.email)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{name}</span>
        {me?.email && me.display_name && (
          <span className="block truncate text-xs text-ink-faint">{me.email}</span>
        )}
      </span>
      <IconButton label="Sign out" onClick={signOut} className="shrink-0">
        <LogOut className="h-[18px] w-[18px]" />
      </IconButton>
    </div>
  );
}

/**
 * The responsive frame: a fixed sidebar from `lg` up, a top bar plus a
 * thumb-reachable bottom tab bar below it.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // A tap that navigates should always close the drawer behind it, so every
  // link inside it closes on the way out rather than after the route settles.
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-cream-300/70 bg-cream-50/95 backdrop-blur lg:flex">
        <div className="px-4 py-4">
          <Wordmark />
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <NavLinks />
        </div>
        <UserBlock />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-cream-300/70 bg-cream-100/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <Wordmark />
        <IconButton label="Menu" onClick={() => setDrawerOpen(true)}>
          <Menu className="h-5 w-5" />
        </IconButton>
      </header>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeDrawer}
              className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-cream-50 shadow-soft-lg"
            >
              <div className="flex items-center justify-between px-4 py-4">
                <Wordmark onNavigate={closeDrawer} />
                <IconButton label="Close menu" onClick={closeDrawer}>
                  <X className="h-5 w-5" />
                </IconButton>
              </div>
              <div className="flex-1 overflow-y-auto px-3">
                <NavLinks onNavigate={closeDrawer} />
              </div>
              <UserBlock />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:pb-12">
          {children}
        </div>
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-cream-300/70 bg-cream-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 pt-1.5 text-[11px] font-semibold transition-colors",
                    active ? "text-pasture-700" : "text-ink-faint",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-indicator"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-pasture-600"
                    />
                  )}
                  <item.icon className="h-5 w-5" aria-hidden />
                  {item.shortLabel ?? item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
