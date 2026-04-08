import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#FCFBF9",
          surface: "#FAF8EF",
          surface2: "#FFFFFF",
          border: "#E8E5D4",
          text1: "#332E2D",
          text2: "#7E8187",
          text3: "#A7ACB4",
          textInvert: "#FFFFFF",
          accent: "#A4B0A3",
          accent2: "#F9E8B0",
          success: "#16A34A",
          danger: "#DC2626",
          warning: "#F59E0B",
          chartPrimary: "#A4B0A3",
          chartMuted: "#A7ACB4",
          chartGrid: "#E8E5D4",
          washAmber: "#F9E8B0",
          washSage: "#A4B0A3",
        },
      },
      borderRadius: {
        sm: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(51, 46, 45, 0.06)",
        card: "0 10px 30px -20px rgba(51, 46, 45, 0.22)",
        float: "0 18px 55px -30px rgba(51, 46, 45, 0.30)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
      },
      transitionDuration: {
        180: "180ms",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 220ms ease-out",
        "fade-in-scale": "fade-in-scale 280ms ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
