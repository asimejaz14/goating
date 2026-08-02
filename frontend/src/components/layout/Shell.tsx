"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

import { SidebarContent } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useSidebar } from "./useSidebar";

/**
 * The responsive frame: a sidebar from `lg` up — full width or collapsed to an
 * icon rail, whichever the user last chose — collapsing to a slide-in drawer
 * below that, with a sticky topbar running the width of the content column.
 *
 * The sidebar is inset with a small margin rather than welded to the window
 * edge, so it reads as a floating panel over the workspace — the shape the
 * reference dashboards use, and the reason its corners are visible at all.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { hidden, toggle, ready } = useSidebar();

  // A route change means navigation already happened — the drawer has
  // nothing left to do open.
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="workspace min-h-dvh bg-background">
      <aside
        aria-hidden={hidden}
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-60 p-3 lg:block",
          // Slid out rather than narrowed: the workspace gets the whole window
          // back, which is the point of asking for it.
          hidden && "pointer-events-none -translate-x-full opacity-0",
          // Only animate once the stored preference has been applied, or every
          // page load would play a slide at whoever chose to hide it.
          ready && "transition-[transform,opacity] duration-250 ease-soft",
        )}
      >
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 w-64 max-w-[82vw] p-3"
            >
              <div className="relative h-full">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="absolute right-3 top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                {/* The drawer always shows labels — it is opened deliberately,
                    and there is no width pressure inside it. */}
                <SidebarContent onNavigate={() => setDrawerOpen(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex min-h-dvh flex-col",
          hidden ? "lg:pl-0" : "lg:pl-60",
          ready && "transition-[padding] duration-250 ease-soft",
        )}
      >
        <Topbar
          onMenu={() => setDrawerOpen(true)}
          onToggleSidebar={toggle}
          sidebarHidden={hidden}
        />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
