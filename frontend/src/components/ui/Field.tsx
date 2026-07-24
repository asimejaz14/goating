"use client";

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
 * Helper text sits under the label rather than under the input so it is read
 * *before* the user starts typing, which is when it actually helps.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={id} className="soft-label">
        {label}
        {required && <span className="ml-0.5 text-clay-600">*</span>}
      </label>
      {hint && <p className="-mt-1 mb-1.5 text-xs text-ink-faint">{hint}</p>}
      {children(id)}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-clay-600">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn("soft-input tap", className)} {...props} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea ref={ref} rows={rows} className={cn("soft-input resize-y", className)} {...props} />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "soft-input tap appearance-none bg-[length:1.1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9",
        // Inline chevron keeps the control one element — no wrapper to misalign.
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%235B6656%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 viewBox=%220 0 24 24%22><polyline points=%226 9 12 15 18 9%22/></svg>')]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

/** Money input with the farm currency locked to the left edge. */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { symbol?: string }
>(function MoneyInput({ symbol = "₨", className, ...props }, ref) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-ink-muted">
        {symbol}
      </span>
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        className={cn("soft-input tnum tap pl-9", className)}
        {...props}
      />
    </div>
  );
});
