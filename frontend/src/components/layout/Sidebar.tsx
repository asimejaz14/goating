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

import { isActivePath, NAV_ITEMS } from "./nav";

/**
 * The fixed ink panel — one constant anchor that does not follow the
 * light/dark toggle, the way Linear's and Vercel's sidebars stay dark in
 * both themes. Used as-is inside the desktop `<aside>` and again, unchanged,
 * inside the mobile slide-in drawer, so navigation looks identical everywhere
 * it appears.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const { signOut } = useAuth();
  const name = me?.display_name || me?.email || "Signed in";

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          G
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">Goat Farm</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center gap-2.5 rounded-md px-3 text-[13.5px] font-medium transition-colors duration-150",
                active
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-1/2 h-4.5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                />
              )}
              <item.icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border px-3 py-3">
        <ThemeToggle variant="sidebar" className="w-full [&>*]:w-full" />
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-sidebar-foreground">
            {initials(me?.display_name ?? me?.email)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-sidebar-foreground">
              {name}
            </span>
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
          >
            <LogOut className="h-[15px] w-[15px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
