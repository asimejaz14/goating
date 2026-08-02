"use client";

import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useMe } from "@/lib/queries";

import { isActivePath, NAV_SECTIONS } from "./nav";

/**
 * The navigation panel.
 *
 * Colours come from `--sidebar-*`, which flip with the theme like everything
 * else, so this panel is light on a light workspace and dark on a dark one
 * rather than being a permanent slab of ink. It slides off the window entirely
 * when hidden — see `Shell` — so there is no narrow state to design for here.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const { signOut } = useAuth();
  const name = me?.display_name || me?.email || "Signed in";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-[13px] font-bold text-white shadow-sm">
          G
        </span>
        <span className="truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground">
          Goat Farm
        </span>
      </div>

      <nav className="scrollbar-none flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-sidebar-muted">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group/nav relative flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13.5px] font-medium transition-colors duration-150",
                      active
                        ? "text-white"
                        : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                    )}
                  >
                    {/* The pill sits at the bottom of the link's own stacking
                        order and the content is lifted above it. A negative
                        z-index would drop it behind the sidebar's background
                        instead — the link is `relative` but creates no stacking
                        context, so "behind the link" means behind the panel. */}
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-sm"
                      />
                    )}
                    <item.icon
                      className="relative z-10 h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover/nav:scale-110"
                      aria-hidden
                    />
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2.5 px-3 pb-3">
        <ThemeToggle className="w-full [&>*]:w-full" />
        <div className="flex items-center gap-2.5 rounded-xl bg-sidebar-hover px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-semibold text-white">
            {initials(me?.display_name ?? me?.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-sidebar-foreground">
              {name}
            </span>
            <span className="block truncate text-[11px] text-sidebar-muted">Farm partner</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-border hover:text-sidebar-foreground"
          >
            <LogOut className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
