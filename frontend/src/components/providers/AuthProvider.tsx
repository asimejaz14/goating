"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/apiClient";
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from "@/lib/authToken";
import { keys } from "@/lib/queries";
import type { CurrentUser } from "@/lib/types";

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const PUBLIC_ROUTES = new Set(["/login"]);

/**
 * Owns the session token, not a Supabase client.
 *
 * The token is good for 60 days, so this is not a short-lived session needing
 * silent refresh — a stored token is trusted until the server actually
 * rejects it, and nothing here signs a partner out on its own.
 *
 * Crucially it does **not** hold the app back waiting for `/me`. It used to,
 * which meant every page load paid for two round trips end to end: `/me`
 * first, and only once that landed did the page mount and start fetching its
 * own data. With a cached user the app renders at once and `/me` revalidates
 * alongside the page's own queries rather than in front of them.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Reading cache in an effect rather than in `useState` keeps the server
    // and client first render identical — no hydration mismatch — while still
    // costing only a frame instead of a network round trip.
    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
      queryClient.setQueryData(keys.me, cached);
      setLoading(false);
    }

    api
      .get<CurrentUser>("/me")
      .then((me) => {
        setUser(me);
        setStoredUser(me);
        queryClient.setQueryData(keys.me, me);
      })
      .catch((error) => {
        // Only a genuine rejection ends the session. A network blip or a 500
        // must not sign someone out mid-task on a farm's patchy connection.
        if (error instanceof ApiError && error.isAuthError) {
          clearStoredSession();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
    // Runs once on mount — signIn/signOut update `user` directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_ROUTES.has(pathname);
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/");
  }, [user, loading, pathname, router]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: async (email: string, password: string) => {
        const result = await api.post<{ access_token: string; user: CurrentUser }>(
          "/auth/login",
          { email, password },
        );
        setStoredToken(result.access_token);
        setStoredUser(result.user);
        setUser(result.user);
        queryClient.setQueryData(keys.me, result.user);
      },
      signOut: () => {
        clearStoredSession();
        setUser(null);
        queryClient.clear();
        router.replace("/login");
      },
    }),
    [user, loading, router, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
