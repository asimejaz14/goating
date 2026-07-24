import type { Config } from "tailwindcss";

/**
 * Warm farm soft-UI.
 *
 * Earthy greens and creams with soft, rounded cards. Neumorphism's softness
 * without its weakness — every text/background pair here clears WCAG AA, because
 * this gets used outdoors on a phone in daylight.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FDFBF6",
          100: "#F8F3E9",
          200: "#F0E8D8",
          300: "#E3D7C0",
        },
        pasture: {
          50: "#F0F5EE",
          100: "#DDE9D8",
          200: "#BCD4B3",
          300: "#94B888",
          400: "#6E9A60",
          500: "#527D45",
          600: "#3F6435",
          700: "#324F2B",
          800: "#263C21",
          900: "#1B2B18",
        },
        barn: {
          50: "#FAF5F0",
          100: "#EFE2D4",
          200: "#DCC4A9",
          300: "#C2A07C",
          400: "#A47D55",
          500: "#84613F",
          600: "#6A4D32",
          700: "#523B27",
          800: "#3B2B1C",
        },
        gold: {
          100: "#FBF0D4",
          300: "#EFD08C",
          500: "#D9A72C",
          600: "#B8891F",
          700: "#8F6A17",
        },
        clay: {
          100: "#FBE7E1",
          300: "#EFAF9C",
          500: "#C85A38",
          600: "#A44528",
          700: "#7E341D",
        },
        ink: {
          DEFAULT: "#1F2A1B",
          muted: "#5B6656",
          faint: "#8A9384",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        // The soft-UI stack: a lifted highlight above, a diffuse shadow below.
        soft: "0 1px 2px rgba(38,60,33,0.04), 0 8px 20px -6px rgba(38,60,33,0.10)",
        "soft-lg": "0 2px 4px rgba(38,60,33,0.05), 0 18px 36px -12px rgba(38,60,33,0.16)",
        "soft-inner": "inset 0 2px 5px rgba(38,60,33,0.07)",
        press: "inset 0 1px 3px rgba(38,60,33,0.16)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
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
