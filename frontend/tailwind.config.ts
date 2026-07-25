import type { Config } from "tailwindcss";

/**
 * Minimal three-colour system: neutral surfaces, one emerald accent, one red.
 *
 * Every colour resolves through a CSS variable defined in globals.css, so the
 * dark theme swaps values rather than requiring `dark:` on every element.
 */
const hsl = (variable: string) => `hsl(var(--${variable}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: hsl("background"),
        surface: {
          DEFAULT: hsl("surface"),
          raised: hsl("surface-raised"),
        },
        foreground: hsl("foreground"),
        muted: {
          DEFAULT: hsl("muted"),
          foreground: hsl("muted-foreground"),
        },
        faint: {
          foreground: hsl("faint-foreground"),
        },
        primary: {
          DEFAULT: hsl("primary"),
          hover: hsl("primary-hover"),
          foreground: hsl("primary-foreground"),
          soft: hsl("primary-soft"),
          "soft-foreground": hsl("primary-soft-foreground"),
        },
        danger: {
          DEFAULT: hsl("danger"),
          hover: hsl("danger-hover"),
          foreground: hsl("danger-foreground"),
          soft: hsl("danger-soft"),
          "soft-foreground": hsl("danger-soft-foreground"),
        },
        border: {
          DEFAULT: hsl("border"),
          strong: hsl("border-strong"),
        },
        ring: hsl("ring"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Restrained elevation — dark mode leans on borders, not drop shadows.
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        sm: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        md: "0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        lg: "0 12px 32px -8px rgb(0 0 0 / 0.14), 0 4px 8px -4px rgb(0 0 0 / 0.06)",
       },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out both",
        "fade-up": "fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-down": "slide-down 160ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s infinite",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
