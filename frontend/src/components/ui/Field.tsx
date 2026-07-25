"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, useId } from "react";

import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (id: string) => React.ReactNode;
}

/**
 * Label + control + helper text, wired together for screen readers.
 *
 * Every control a `Field` wraps is exactly 40px tall, and the field itself is
 * a full-height column that pushes the control to the bottom. That second part
 * is what keeps a two-column row aligned: "Name" carries a one-line hint and
 * "Breed" carries none, so without it the two inputs sit at visibly different
 * heights — which is exactly how the goat form looked.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={cn("flex h-full w-full min-w-0 flex-col", className)}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {hint && <p className="-mt-1 mb-1.5 text-xs leading-snug text-faint-foreground">{hint}</p>}
      <div className="mt-auto">
        {children(id)}
        {error && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn("field", className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn("field h-auto resize-y py-2 leading-relaxed", className)}
      {...props}
    />
  );
});

/**
 * Native select with our own chevron.
 *
 * The arrow is a sibling span rather than a background-image so it inherits
 * the current text colour and therefore flips with the theme for free.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn("field cursor-pointer appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
});

/** Money input with the farm currency locked to the left edge. */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { symbol?: string }
>(function MoneyInput({ symbol = "₨", className, ...props }, ref) {
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        {symbol}
      </span>
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        className={cn("field tnum pl-8", className)}
        {...props}
      />
    </div>
  );
});
