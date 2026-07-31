import type { Config } from "tailwindcss";

/**
 * Operations-tool palette: one blue for action, one sky for secondary
 * emphasis, and the three status colours every dashboard needs.
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
          hover: hsl("sidebar-hover"),
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
        "2xl": "1.25rem", // 20px — the sidebar panel and other large surfaces
        xl: "var(--radius-xl)", // 16px — cards, dialogs, drawers
        lg: "var(--radius-lg)", // 12px — inner blocks, list rows, popovers
        md: "var(--radius-md)", // 10px — inputs, buttons
        sm: "var(--radius-sm)", // 8px — badges, chips
      },
      // Read from variables so each theme can define its own — see globals.css.
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
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
        // The sidebar collapse. Slower than a hover so the width change reads
        // as the panel moving rather than the layout jumping.
        250: "250ms",
      },
    },
  },
  plugins: [],
};

export default config;
