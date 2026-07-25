"use client";

import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/cn";

import { Tooltip } from "./Tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
  secondary:
    "border border-border bg-surface text-foreground shadow-xs hover:bg-muted hover:border-border-strong",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "bg-danger text-danger-foreground shadow-xs hover:bg-danger-hover",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-md px-2.5 text-[13px]",
  md: "h-9 gap-2 rounded-md px-3.5 text-sm",
  lg: "h-10 gap-2 rounded-md px-4 text-sm",
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
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-soft",
        "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
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

/**
 * Icon-only button. The label is required and becomes both the accessible
 * name and a real tooltip — an icon with no words needs to be able to say
 * what it does.
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    size?: "sm" | "md";
    /** Set when the surrounding text already explains the control. */
    hideTooltip?: boolean;
  }
>(function IconButton({ label, size = "md", hideTooltip, className, children, ...props }, ref) {
  const button = (
    <button
      ref={ref}
      type={props.type ?? "button"}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground",
        "transition-colors duration-150 hover:bg-muted hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );

  if (hideTooltip) return button;
  return <Tooltip label={label}>{button}</Tooltip>;
});
