"use client";

import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useMe } from "@/lib/queries";

import { isActivePath, NAV_SECTIONS } from "./nav";

/**
 * The navigation panel, in two widths.
 *
 * Expanded it lists grouped links; collapsed it becomes an icon rail, which is
 * what someone who knows the six destinations by heart actually wants — the
 * labels stop earning their width and the table beside them gets it instead.
 * Every icon keeps a tooltip in that state so the rail is still readable to
 * someone who does not know it by heart yet.
 *
 * Colours come from `--sidebar-*`, which flip with the theme like everything
 * else, so this panel is light on a light workspace and dark on a dark one
 * rather than being a permanent slab of ink.
 */
export function SidebarContent({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const { signOut } = useAuth();
  const name = me?.display_name || me?.email || "Signed in";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xs">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2.5",
          collapsed ? "justify-center px-2" : "px-5",
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-[13px] font-bold text-white shadow-sm">
          G
        </span>
        {!collapsed && (
          <span className="truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            Goat Farm
          </span>
        )}
      </div>

      <nav
        className={cn(
          "scrollbar-none flex-1 overflow-y-auto pb-3",
          collapsed ? "space-y-2 px-2" : "space-y-5 px-3",
        )}
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {collapsed ? (
              // A heading has nowhere to go at rail width; a hairline keeps the
              // grouping legible without pretending to be a word.
              <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border first:hidden" />
            ) : (
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-sidebar-muted">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex h-9 items-center rounded-xl text-[13.5px] font-medium transition-colors duration-150",
                      collapsed ? "justify-center px-0" : "gap-2.5 px-3",
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
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-sm"
                      />
                    )}
                    <item.icon className="relative z-10 h-[17px] w-[17px] shrink-0" aria-hidden />
                    {!collapsed && <span className="relative z-10">{item.label}</span>}
                  </Link>
                );

                return collapsed ? (
                  <Tooltip key={item.href} label={item.label} side="right" block>
                    {link}
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("space-y-2.5 pb-3", collapsed ? "px-2" : "px-3")}>
        <ThemeToggle
          className={cn("w-full [&>*]:w-full", collapsed && "[&>*]:grid-cols-1")}
          compact={collapsed}
        />
        <div
          className={cn(
            "flex items-center rounded-xl bg-sidebar-hover",
            collapsed ? "justify-center p-1.5" : "gap-2.5 px-2.5 py-2",
          )}
        >
          {collapsed ? (
            <Tooltip label={name} side="right">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-semibold text-white">
                {initials(me?.display_name ?? me?.email)}
              </span>
            </Tooltip>
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-semibold text-white">
              {initials(me?.display_name ?? me?.email)}
            </span>
          )}
          {!collapsed && (
            <>
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
            </>
          )}
        </div>
        {collapsed && (
          <Tooltip label="Sign out" side="right">
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="flex h-9 w-full items-center justify-center rounded-xl text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
            >
              <LogOut className="h-[15px] w-[15px]" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
