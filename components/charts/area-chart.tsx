"use client";

import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { CHART_COLORS, CHART_CONFIG, formatChartLabel, formatChartValue } from "./chart-theme";

export interface AreaChartDataPoint {
    label: string;
    value: number;
    secondary?: number;
}

interface AreaChartProps {
    data: AreaChartDataPoint[];
    height?: number;
    showGrid?: boolean;
    showSecondary?: boolean;
    valueUnit?: "DKK" | "%" | "number";
    gradientId?: string;
}

export function WealthAreaChart({
    data,
    height = 300,
    showGrid = true,
    showSecondary = false,
    valueUnit = "DKK",
    gradientId = "areaGradient",
}: AreaChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsAreaChart data={data} margin={CHART_CONFIG.margin}>
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id={`${gradientId}-secondary`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                {showGrid && (
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={CHART_COLORS.grid}
                        vertical={false}
                    />
                )}
                <XAxis
                    dataKey="label"
                    axisLine={{ stroke: CHART_COLORS.grid }}
                    tickLine={false}
                    tick={{ fill: CHART_COLORS.textMuted, fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_COLORS.textMuted, fontSize: 12 }}
                    tickFormatter={formatChartLabel}
                    dx={-10}
                />
                <Tooltip
                    contentStyle={CHART_CONFIG.tooltip.contentStyle}
                    labelStyle={CHART_CONFIG.tooltip.labelStyle}
                    formatter={(value: number) => [formatChartValue(value, valueUnit), ""]}
                />
                {showSecondary && (
                    <Area
                        type="monotone"
                        dataKey="secondary"
                        stroke={CHART_COLORS.secondary}
                        strokeWidth={1.5}
                        fill={`url(#${gradientId}-secondary)`}
                        animationDuration={CHART_CONFIG.animation.duration}
                    />
                )}
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    animationDuration={CHART_CONFIG.animation.duration}
                />
            </RechartsAreaChart>
        </ResponsiveContainer>
    );
}
