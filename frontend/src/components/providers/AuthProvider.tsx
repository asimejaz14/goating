"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/apiClient";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/authToken";
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
 * The backend mints a token good for 60 days at login, so this is not a
 * short-lived session that needs silent refreshing — a stored token is
 * trusted until the server actually rejects it, and nothing here signs a
 * partner out on its own.
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
    api
      .get<CurrentUser>("/me")
      .then((me) => {
        setUser(me);
        queryClient.setQueryData(keys.me, me);
      })
      .catch(() => clearStoredToken())
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
        setUser(result.user);
        queryClient.setQueryData(keys.me, result.user);
      },
      signOut: () => {
        clearStoredToken();
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
