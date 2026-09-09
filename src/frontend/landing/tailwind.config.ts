import type { Config } from "tailwindcss";
import flowbite from "flowbite/plugin";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
    "./node_modules/flowbite/**/*.js",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        void: "#05080E",
        surface: {
          DEFAULT: "#0A0F1A",
          raised: "#0E1524",
          border: "#1B2536",
        },
        cyan: {
          glow: "#22D3EE",
        },
        accent: {
          DEFAULT: "#3B82F6",
          cyan: "#22D3EE",
          dim: "#1D4E89",
        },
        ink: {
          primary: "#E7ECF5",
          secondary: "#94A3B8",
          tertiary: "#5B677A",
        },
        signal: {
          verified: "#34D399",
          review: "#FBBF24",
          flagged: "#F87171",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)",
        "radial-fade":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.15), transparent)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        "glow-cyan": "0 0 40px -10px rgba(34,211,238,0.35)",
        "glow-blue": "0 0 40px -10px rgba(59,130,246,0.35)",
        "inset-border": "inset 0 0 0 1px rgba(148,163,184,0.08)",
      },
      animation: {
        "spin-slow": "spin 6s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
      },
    },
  },
  plugins: [flowbite],
};

export default config;
