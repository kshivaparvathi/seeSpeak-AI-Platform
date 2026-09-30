import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#f0f4ff",
          100: "#e0e9fe",
          200: "#c7d7fe",
          300: "#a5bcfc",
          400: "#819af8",
          500: "#6374f2",
          600: "#4f5be8",
          700: "#3d44cf",
          800: "#3339a7",
          900: "#2d3384",
          950: "#1b1d4e",
        },
        surface: {
          light: "#ffffff",
          dark: "#0f172a",
          darkElevated: "#1e293b",
        }
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "orb-glow": "orbGlow 4s ease-in-out infinite alternate",
        "ripple": "ripple 2s linear infinite",
        "wave": "wave 1.2s ease-in-out infinite",
      },
      keyframes: {
        orbGlow: {
          "0%": { transform: "scale(0.95)", opacity: "0.8", filter: "blur(20px)" },
          "100%": { transform: "scale(1.15)", opacity: "1", filter: "blur(32px)" },
        },
        ripple: {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        wave: {
          "0%, 100%": { height: "8px" },
          "50%": { height: "36px" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
