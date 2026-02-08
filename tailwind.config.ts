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
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      transitionDuration: {
        180: "180ms",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 220ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
