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
 * The fixed ink panel — one constant anchor that does not follow the
 * light/dark toggle, the way Linear's and Vercel's sidebars stay dark in
 * both themes. Used as-is inside the desktop `<aside>` and again, unchanged,
 * inside the mobile slide-in drawer, so navigation looks identical everywhere
 * it appears.
 *
 * The active link is a filled pill rather than a hairline marker: at a glance
 * from across a shed, "which page am I on" should be answerable by shape and
 * not by a two-pixel detail.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const { signOut } = useAuth();
  const name = me?.display_name || me?.email || "Signed in";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-[13px] font-bold text-white shadow-sm">
          G
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">Goat Farm</span>
      </div>

      <nav className="scrollbar-none flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-sidebar-muted/70">
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
                      "relative flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13.5px] font-medium transition-colors duration-150",
                      active
                        ? "text-white"
                        : "text-sidebar-muted hover:bg-white/[0.06] hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-sm"
                      />
                    )}
                    <item.icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2.5 px-3 pb-3">
        <ThemeToggle variant="sidebar" className="w-full [&>*]:w-full" />
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-2.5 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-semibold text-white">
            {initials(me?.display_name ?? me?.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-white">{name}</span>
            <span className="block truncate text-[11px] text-sidebar-muted">Farm partner</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
