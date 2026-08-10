"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Toasts sit on the surface colour and let a single coloured icon carry the
// tone — a fully tinted panel shouting from the corner is exactly the kind of
// noise this palette is trying to avoid.
const TONE = {
  success: { icon: CheckCircle2, className: "text-primary" },
  error: { icon: AlertTriangle, className: "text-danger" },
  info: { icon: Info, className: "text-muted-foreground" },
} as const;

/** Errors linger — the farmer may be mid-task and need to read what went wrong. */
const DURATION: Record<ToastTone, number> = { success: 3000, info: 3500, error: 6000 };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), DURATION[tone]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Above the mobile tab bar, out of the thumb zone, never covering a form. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, className } = TONE[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                /* Toasts arrive from below and leave the same way. A symmetric
                   path is what makes the dismissal read as the reverse of the
                   arrival rather than as a second, unrelated animation.
                   Motion values retarget from wherever they currently are, so
                   a second toast landing mid-flight joins the stack smoothly
                   instead of restarting — the reason not to use keyframes for
                   anything that can fire twice in a second. */
                initial={{ opacity: 0, transform: "translateY(16px) scale(0.97)" }}
                animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
                exit={{ opacity: 0, transform: "translateY(16px) scale(0.97)" }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3 text-foreground shadow-lg"
              >
                <Icon className={`mt-px h-4 w-4 shrink-0 ${className}`} aria-hidden />
                <p className="flex-1 text-[13px] font-medium leading-snug">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="-m-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>.");
  return context;
}
