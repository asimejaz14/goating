"use client";

import { motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";
import { GoatPlaceholder } from "@/components/ui/GoatPhoto";

import { Shell } from "./Shell";

const PUBLIC_ROUTES = new Set(["/login"]);

/** Shown while the Supabase session is being restored — no jarring flash. */
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

/** First-run help when `.env.local` has not been filled in yet. */
function SetupNeeded() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="soft-card w-full max-w-md p-6">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-100 text-gold-700">
          <Settings2 className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-bold text-ink">One more setup step</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
          The portal needs your Supabase keys before it can sign anyone in. Copy{" "}
          <code className="rounded-md bg-cream-200 px-1.5 py-0.5 text-[13px]">
            frontend/.env.local.example
          </code>{" "}
          to{" "}
          <code className="rounded-md bg-cream-200 px-1.5 py-0.5 text-[13px]">.env.local</code>,
          fill in your project URL and anon key, then restart{" "}
          <code className="rounded-md bg-cream-200 px-1.5 py-0.5 text-[13px]">npm run dev</code>.
        </p>
        <p className="mt-3 text-sm text-ink-faint">
          The README walks through creating the project and running the migrations.
        </p>
      </div>
    </div>
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { session, loading, configured } = useAuth();
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  if (!configured) return <SetupNeeded />;
  if (loading) return <Splash />;

  // The redirect is already in flight in AuthProvider; hold the splash rather
  // than flashing a half-rendered page the user is about to be moved off.
  if (!session && !isPublic) return <Splash />;
  if (isPublic) return <>{children}</>;

  return <Shell>{children}</Shell>;
}
