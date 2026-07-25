"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { IconButton } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useMe } from "@/lib/queries";

import { isActivePath, MOBILE_NAV_ITEMS, NAV_ITEMS } from "./nav";

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
        BG
      </span>
      <span className="text-sm font-semibold tracking-tight text-foreground">Goat Farm</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
              />
            )}
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
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
    <div className="space-y-3 border-t border-border px-3 py-3">
      <ThemeToggle className="w-full [&>*]:w-full" />
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
          {initials(me?.display_name ?? me?.email)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">{name}</span>
          {me?.email && me.display_name && (
            <span className="block truncate text-xs text-faint-foreground">{me.email}</span>
          )}
        </span>
        <IconButton label="Sign out" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </IconButton>
      </div>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center px-4">
          <Wordmark />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks />
        </div>
        <UserBlock />
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface/85 px-4 backdrop-blur lg:hidden">
        <Wordmark />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <IconButton label="Menu" onClick={() => setDrawerOpen(true)}>
            <Menu className="h-5 w-5" />
          </IconButton>
        </div>
      </header>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={closeDrawer}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 flex w-64 max-w-[82vw] flex-col border-r border-border bg-surface shadow-lg"
            >
              <div className="flex h-14 items-center justify-between px-4">
                <Wordmark onNavigate={closeDrawer} />
                <IconButton label="Close menu" hideTooltip onClick={closeDrawer}>
                  <X className="h-5 w-5" />
                </IconButton>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2">
                <NavLinks onNavigate={closeDrawer} />
              </div>
              <UserBlock />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="lg:pl-56">
        <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:pb-10">
          {children}
        </div>
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
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
                    "relative flex min-h-[52px] flex-col items-center justify-center gap-1 px-1 pt-1 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-indicator"
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary"
                    />
                  )}
                  <item.icon className="h-[18px] w-[18px]" aria-hidden />
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
