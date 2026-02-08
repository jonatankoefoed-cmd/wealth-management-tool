# DESIGN_TOKENS.md
Personal Wealth Management Web App
Version 2.0

## 1) Colors
Warm neutrals + Sage accent (no fintech blue).

Base surfaces:
- bg:        #FCFBF9
- surface:   #FAF8EF
- surface-2: #FFFFFF
- border:    #E8E5D4

Text:
- text-1: #332E2D
- text-2: #7E8187
- text-3: #A7ACB4
- text-invert: #FFFFFF

Accents:
- accent:     #A4B0A3   (Sage primary)
- accent-2:   #F9E8B0   (Amber highlight, use sparingly)
- danger:     #DC2626
- success:    #16A34A
- warning:    #F59E0B   (rare)

Ambient wash (background only, optional):
- wash-amber: #F9E8B0
- wash-sage:  #A4B0A3

Charts:
- chart-primary: #A4B0A3
- chart-muted:   #A7ACB4
- chart-grid:    #E8E5D4

## 2) Radius
- r-sm: 10px
- r-md: 12px
- r-lg: 16px
- r-xl: 20px
- r-2xl: 24px

## 3) Shadows
- shadow-soft:   0 1px 2px rgba(51, 46, 45, 0.06)
- shadow-card:   0 10px 30px -20px rgba(51, 46, 45, 0.22)
- shadow-float:  0 18px 55px -30px rgba(51, 46, 45, 0.30)

## 4) Typography
Font family:
- Inter, system stack, tabular numerals where possible.

## 5) Tailwind config extension (exact)
Add to tailwind.config.ts under theme.extend:

```ts
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
}
```

## 6) Usage rules

* Default page background: bg-brand-bg
* Card: bg-brand-surface2 border border-brand-border shadow-soft rounded-lg
* Primary action: bg-brand-accent text-brand-textInvert
* Accent-2 is for small highlights only (badges, subtle chart emphasis)
* Never use both accent and accent-2 as strong colors on the same screen

End of file.
