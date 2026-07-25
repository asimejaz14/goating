"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/AuthProvider";

import { Shell } from "./Shell";

const PUBLIC_ROUTES = new Set(["/login"]);

/** Shown while a stored token is being checked against the server — brief, quiet, on-brand. */
function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
        G
      </span>
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
