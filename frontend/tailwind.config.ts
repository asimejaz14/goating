import type { Config } from "tailwindcss";

/**
 * Operations-tool palette: ink sidebar, one blue for action, one sky for
 * secondary emphasis, and the three status colours every dashboard needs.
 * Every colour resolves through a CSS variable defined in globals.css, so the
 * light/dark switch is a value swap rather than `dark:` scattered everywhere.
 */
const hsl = (variable: string) => `hsl(var(--${variable}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1.1rem" }],
      sm: ["0.8125rem", { lineHeight: "1.25rem" }],
      base: ["0.875rem", { lineHeight: "1.4rem" }],
      md: ["0.9375rem", { lineHeight: "1.5rem" }],
      lg: ["1.0625rem", { lineHeight: "1.6rem" }],
      xl: ["1.25rem", { lineHeight: "1.75rem" }],
      "2xl": ["1.5rem", { lineHeight: "2rem" }],
      "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
    },
    extend: {
      colors: {
        sidebar: {
          DEFAULT: hsl("sidebar"),
          foreground: hsl("sidebar-foreground"),
          muted: hsl("sidebar-muted"),
          border: hsl("sidebar-border"),
          active: hsl("sidebar-active"),
        },
        background: hsl("background"),
        surface: {
          DEFAULT: hsl("surface"),
          sunken: hsl("surface-sunken"),
        },
        foreground: hsl("foreground"),
        muted: {
          DEFAULT: hsl("muted"),
          foreground: hsl("muted-foreground"),
        },
        faint: {
          foreground: hsl("faint-foreground"),
        },
        border: {
          DEFAULT: hsl("border"),
          strong: hsl("border-strong"),
        },
        primary: {
          DEFAULT: hsl("primary"),
          hover: hsl("primary-hover"),
          active: hsl("primary-active"),
          foreground: hsl("primary-foreground"),
          soft: hsl("primary-soft"),
          "soft-foreground": hsl("primary-soft-foreground"),
        },
        accent: {
          DEFAULT: hsl("accent"),
          soft: hsl("accent-soft"),
          "soft-foreground": hsl("accent-soft-foreground"),
        },
        success: {
          DEFAULT: hsl("success"),
          soft: hsl("success-soft"),
          "soft-foreground": hsl("success-soft-foreground"),
        },
        warning: {
          DEFAULT: hsl("warning"),
          soft: hsl("warning-soft"),
          "soft-foreground": hsl("warning-soft-foreground"),
        },
        danger: {
          DEFAULT: hsl("danger"),
          hover: hsl("danger-hover"),
          foreground: hsl("danger-foreground"),
          soft: hsl("danger-soft"),
          "soft-foreground": hsl("danger-soft-foreground"),
        },
        ring: hsl("ring"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius-lg)", // 12px — cards, dialogs, drawers
        md: "var(--radius-md)", // 8px — inputs, buttons
        sm: "var(--radius-sm)", // 6px — badges, chips
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        sm: "0 1px 3px 0 rgb(15 23 42 / 0.07), 0 1px 2px -1px rgb(15 23 42 / 0.05)",
        md: "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.05)",
        lg: "0 16px 40px -12px rgb(15 23 42 / 0.18), 0 4px 10px -4px rgb(15 23 42 / 0.06)",
      },
      spacing: {
        4.5: "1.125rem",
        13: "3.25rem",
        15: "3.75rem",
        18: "4.5rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out both",
        "fade-up": "fade-up 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-down": "slide-down 150ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s infinite",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
