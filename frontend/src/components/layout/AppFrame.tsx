"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { GoatPlaceholder } from "@/components/ui/GoatPhoto";

import { Shell } from "./Shell";

const PUBLIC_ROUTES = new Set(["/login"]);

/** Shown while a stored token is being checked against the server — no jarring flash. */
function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="h-20 w-20"
      >
        <GoatPlaceholder />
      </motion.div>
      <p className="text-sm font-medium text-ink-muted">Opening the farm records…</p>
    </div>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  if (loading) return <Splash />;

  // The redirect is already in flight in AuthProvider; hold the splash rather
  // than flashing a half-rendered page the user is about to be moved off.
  if (!user && !isPublic) return <Splash />;
  if (isPublic) return <>{children}</>;

  return <Shell>{children}</Shell>;
}
