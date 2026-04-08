/**
 * Chart theme constants aligned with design tokens
 * Uses brand colors from tailwind.config.ts
 */

export const CHART_COLORS = {
    // Primary series colors
    primary: "#A4B0A3", // Sage accent
    secondary: "#7E8187", // Text2
    tertiary: "#A7ACB4", // Text3/Muted

    // Semantic colors
    success: "#16A34A",
    danger: "#DC2626",
    warning: "#F59E0B",

    // UI colors
    grid: "#E8E5D4",
    background: "#FCFBF9",
    surface: "#FAF8EF",
    text: "#332E2D",
    textMuted: "#7E8187",

    // Accents for multi-series
    amber: "#F9E8B0",
    sage: "#A4B0A3",
} as const;

// Palette for donut/pie charts with good contrast
export const ALLOCATION_PALETTE = [
    "#A4B0A3", // Sage
    "#7E8187", // Gray
    "#F9E8B0", // Amber
    "#A7ACB4", // Light gray
    "#16A34A", // Success green
    "#DC2626", // Danger red
    "#E8E5D4", // Border
] as const;

// Common chart configuration
export const CHART_CONFIG = {
    animation: {
        duration: 300,
        easing: "ease-out" as const,
    },
    margin: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
    },
    tooltip: {
        contentStyle: {
            backgroundColor: "#FFFFFF",
            border: "1px solid #E8E5D4",
            borderRadius: "12px",
            boxShadow: "0 10px 30px -20px rgba(51, 46, 45, 0.22)",
            padding: "12px 16px",
        },
        labelStyle: {
            color: "#332E2D",
            fontWeight: 500,
            marginBottom: 4,
        },
        itemStyle: {
            color: "#7E8187",
            fontSize: 13,
        },
    },
    axis: {
        stroke: "#E8E5D4",
        tick: {
            fill: "#7E8187",
            fontSize: 12,
        },
    },
} as const;

// Format functions for chart labels
export function formatChartValue(value: number, unit: "DKK" | "%" | "number" = "DKK"): string {
    if (unit === "%") {
        return `${value.toFixed(1)}%`;
    }
    if (unit === "DKK") {
        if (Math.abs(value) >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)} mio. kr.`;
        }
        if (Math.abs(value) >= 1_000) {
            return `${(value / 1_000).toFixed(0)} t. kr.`;
        }
        return `${value.toFixed(0)} kr.`;
    }
    return value.toLocaleString("da-DK");
}

export function formatChartLabel(value: number): string {
    if (Math.abs(value) >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toString();
}
