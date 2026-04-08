# Data Visualization Strategy

> **Frontend Architecture component**  
> Focused on: Recharts, Animation, and Brand Integration

---

## 1. Core Philosophy: "Calm Precision"

Visualizations must balance **financial accuracy** with **aesthetic calm**.
- No "noisy" grids or jarring colors.
- Smooth transitions to show change over time, not jumpy updates.
- Interaction reveals detail; default view is clean.

## 2. Tech Stack Selection

| Component | Technology | Reasoning |
|-----------|------------|-----------|
| **Chart Engine** | **Recharts** | Declarative, SVG-based, highly customisable via React props. |
| **Animation** | **Framer Motion** | Best-in-class layout transitions and micro-interactions. |
| **Styling** | **Tailwind CSS** | Consistent utility classes for containers, tooltips, and legends. |
| **Logic** | **Custom Hooks** | Extract data processing (e.g., `usePortfolioHistory`) from UI. |

---

## 3. Chart Types & Brand Application

### A. The "Mountain" (Area Chart)
**Use for:** Total Net Worth, Portfolio Value over Time.
- **Fill:** Gradient from Sage (#A4B0A3) to transparent.
- **Stroke:** Solid Sage (#A4B0A3), 2px width.
- **Animation:** `monotone` interpolation for organic curves. initial grow animation.

### B. The "Stacks" (Stacked Bar Chart)
**Use for:** Monthly Spending, Tax Breakdown, Asset Allocation.
- **Colors:**
  - Sage (#A4B0A3)
  - Warm Charcoal (#332E2D)
  - Soft Gray (#7E8187)
  - Muted Amber (#D6CEC3)
- **Radius:** Top-only rounded corners (4px) on bars.
- **Animation:** Staggered entry from bottom up.

### C. The "Donut" (Pie Chart)
**Use for:** Current Portfolio Diversity.
- **Inner Radius:** 60-70% (thin ring > thick pie).
- **Interaction:** Active segment scales up slightly + slight shadow.
- **Center:** Total value shown in text in the middle.

---

## 4. Animation Strategy (Framer Motion)

Charts should feel "alive" but not distracted.

1.  **Entry:**
    - Graphs draw line from left to right (duration: 1.5s, ease: "easeInOut").
    - Bars grow from bottom (staggered by 0.1s).
2.  **Update:**
    - Creating a new projection? The line morfphs smoothly to the new path. don't snap.
3.  **Interaction:**
    - Tooltips float smoothly (`spring` physics) to cursor position.
    - Hovering a legend item dims other series.

---

## 5. Recharts Implementation Pattern

We will create a **Reusable Chart Wrapper** to enforce consistency.

```tsx
// src/components/charts/AreaChartWrapper.tsx

interface AreaChartProps {
  data: any[];
  xKey: string;
  series: { key: string; color: string; name: string }[];
  height?: number;
}

export const AreaChartWrapper = ({ data, xKey, series, height = 300 }: AreaChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={s.color} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
        <XAxis 
          dataKey={xKey} 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#6B7280', fontSize: 12 }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#6B7280', fontSize: 12 }} 
        />
        <Tooltip content={<CustomTooltip />} />
        {series.map((s) => (
          <Area 
            key={s.key}
            type="monotone" 
            dataKey={s.key} 
            stroke={s.color} 
            fill={`url(#grad-${s.key})`} 
            strokeWidth={2}
            animationDuration={1500}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

## 6. Next Steps

1.  **Install Dependencies:** `npm install recharts framer-motion`
2.  **Create Token Map:** Map `DESIGN_TOKENS.md` colors to a JS object for Recharts.
3.  **Build `CustomTooltip`:** A unified tooltip component using Shadcn `Card` styling.
4.  **Prototype `HousingProjection`:** The first complex chart combining line (equity) and area (debt).
