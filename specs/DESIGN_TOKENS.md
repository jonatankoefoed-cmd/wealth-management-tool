# DESIGN_TOKENS.md
Personal Wealth Management Web App  
Version 1.0

This file defines exact tokens for Tailwind: colors, radius, shadows, and typography.
The goal is a clinical, minimal, high-trust aesthetic inspired by OpenAI and Revolut, with Apple-like clarity and hierarchy.

## 1) Color tokens (hex)
Use semantic tokens instead of raw colors in components.

### Surfaces
- bg:        #FFFFFF
- surface:   #F7F7F8
- surface-2: #FFFFFF
- border:    #E5E7EB

### Text
- text-1: #111827
- text-2: #6B7280
- text-3: #9CA3AF
- text-invert: #FFFFFF

### Accent and states
- accent:  #2563EB
- success: #16A34A
- danger:  #DC2626
- warning: #F59E0B

### Chart palette (minimal)
Charts must highlight only one series at a time.
- chart-primary: #2563EB
- chart-muted:   #9CA3AF
- chart-grid:    #E5E7EB

## 2) Radius tokens
Soft geometry everywhere.
- r-sm: 10px
- r-md: 12px
- r-lg: 16px
- r-xl: 20px
- r-2xl: 24px

## 3) Shadow tokens
Subtle, never harsh.
- shadow-soft:   0 1px 2px rgba(17, 24, 39, 0.06)
- shadow-card:   0 8px 24px -16px rgba(17, 24, 39, 0.18)
- shadow-float:  0 18px 50px -28px rgba(17, 24, 39, 0.28)

## 4) Typography tokens
Use neutral modern fonts. Prioritize number readability.

Font family:
- sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"

Use tabular numerals for financial values where possible.

Font sizes (Tailwind scale override suggestion):
- xs:  12px
- sm:  13px
- base: 15px
- lg:  16px
- xl:  18px
- 2xl: 20px
- 3xl: 24px
- 4xl: 32px

Line heights:
- tight: 1.2
- snug:  1.35
- normal: 1.5
- relaxed: 1.65

Letter spacing:
- tight: -0.01em
- normal: 0em

## 5) Tailwind config (exact)
Add these tokens to tailwind.config.ts under theme.extend.

```ts
import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#FFFFFF",
          surface: "#F7F7F8",
          surface2: "#FFFFFF",
          border: "#E5E7EB",
          text1: "#111827",
          text2: "#6B7280",
          text3: "#9CA3AF",
          textInvert: "#FFFFFF",
          accent: "#2563EB",
          success: "#16A34A",
          danger: "#DC2626",
          warning: "#F59E0B",
          chartPrimary: "#2563EB",
          chartMuted: "#9CA3AF",
          chartGrid: "#E5E7EB",
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
        soft: "0 1px 2px rgba(17, 24, 39, 0.06)",
        card: "0 8px 24px -16px rgba(17, 24, 39, 0.18)",
        float: "0 18px 50px -28px rgba(17, 24, 39, 0.28)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          "Roboto",
          "Arial",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.35" }],
        sm: ["13px", { lineHeight: "1.45" }],
        base: ["15px", { lineHeight: "1.55" }],
        lg: ["16px", { lineHeight: "1.55" }],
        xl: ["18px", { lineHeight: "1.45" }],
        "2xl": ["20px", { lineHeight: "1.35" }],
        "3xl": ["24px", { lineHeight: "1.25" }],
        "4xl": ["32px", { lineHeight: "1.15" }],
      },
      letterSpacing: {
        tight: "-0.01em",
        normal: "0em",
      },
    },
  },
  plugins: [],
} satisfies Config;
