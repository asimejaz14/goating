"use client";

import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/apiClient";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // AuthProvider now holds the new session and routes to the dashboard.
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Cannot reach the server right now. Check your connection.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          {/* Same mark as the sidebar, so the first screen and every screen
              after it are recognisably the same product. */}
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-white shadow-sm">
            G
          </span>
          <h1 className="mt-4 text-xl font-semibold text-foreground">Goat Farm Portal</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to manage the herd and the ledger.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-5">
          <Field label="Email">
            {(id) => (
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-foreground"
                  aria-hidden
                />
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@farm.com"
                  className="pl-9"
                />
              </div>
            )}
          </Field>

          <Field label="Password">
            {(id) => (
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-foreground"
                  aria-hidden
                />
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            )}
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-soft px-3 py-2 text-sm font-medium text-danger-soft-foreground"
            >
              {error}
            </p>
          )}

          <Button type="submit" block size="lg" loading={submitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs leading-relaxed text-faint-foreground">
          Accounts are added by the farm owner directly in the database.
        </p>
      </motion.div>
    </div>
  );
}
