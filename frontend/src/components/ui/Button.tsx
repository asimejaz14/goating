"use client";

import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-pasture-600 text-cream-50 shadow-soft hover:bg-pasture-700 active:shadow-press",
  secondary:
    "border border-cream-300 bg-cream-50 text-ink shadow-soft hover:bg-cream-100 active:shadow-press",
  ghost: "text-ink-muted hover:bg-cream-200 hover:text-ink",
  danger: "bg-clay-600 text-cream-50 shadow-soft hover:bg-clay-700 active:shadow-press",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-12 px-5 text-base gap-2 rounded-2xl",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Renders full-width — the default for the sticky mobile action bar. */
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, block, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-all duration-150 ease-soft",
        "disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/** Circular icon-only button — always 44px so it stays thumb-friendly. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(function IconButton({ label, className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type={props.type ?? "button"}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-muted",
        "transition-colors duration-150 hover:bg-cream-200 hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
