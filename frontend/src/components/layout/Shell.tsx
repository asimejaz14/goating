"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PageActionProvider } from "./PageActionContext";
import { SidebarContent } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * The responsive frame: a fixed 240px sidebar from `lg` up, collapsing to a
 * slide-in drawer below it, with a sticky topbar running the width of the
 * content column.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // A route change means navigation already happened — the drawer has
  // nothing left to do open.
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <PageActionProvider>
      <div className="min-h-dvh bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
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
                className="absolute inset-y-0 left-0 w-64 max-w-[82vw] shadow-lg"
              >
                <div className="relative h-full">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close menu"
                    className="absolute right-3 top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <SidebarContent onNavigate={() => setDrawerOpen(false)} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex min-h-dvh flex-col lg:pl-60">
          <Topbar onMenu={() => setDrawerOpen(true)} />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </PageActionProvider>
  );
}
