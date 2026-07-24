"use client";

import type { Session } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { isSupabaseConfigured } from "@/lib/env";
import { getSupabase } from "@/lib/supabaseClient";

interface AuthState {
  session: Session | null;
  loading: boolean;
  /** Supabase env vars missing — the setup screen explains what to do. */
  configured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const PUBLIC_ROUTES = new Set(["/login"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Without Supabase keys there is no session to wait for, so we start settled
  // and the setup screen renders on the first paint instead of after a flash.
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Covers sign-in, sign-out and silent token refresh in other tabs too.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || !isSupabaseConfigured) return;
    const isPublic = PUBLIC_ROUTES.has(pathname);
    if (!session && !isPublic) router.replace("/login");
    if (session && isPublic) router.replace("/");
  }, [session, loading, pathname, router]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      configured: isSupabaseConfigured,
      signOut: async () => {
        if (isSupabaseConfigured) await getSupabase().auth.signOut();
        setSession(null);
        router.replace("/login");
      },
    }),
    [session, loading, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
