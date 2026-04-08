"use client";

import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts";
import { CHART_COLORS, CHART_CONFIG, formatChartLabel, formatChartValue } from "./chart-theme";

export interface BarChartDataPoint {
    label: string;
    value: number;
    secondary?: number;
    color?: string;
}

interface BarChartProps {
    data: BarChartDataPoint[];
    height?: number;
    showGrid?: boolean;
    stacked?: boolean;
    showSecondary?: boolean;
    valueUnit?: "DKK" | "%" | "number";
    primaryLabel?: string;
    secondaryLabel?: string;
    barRadius?: number;
}

export function WealthBarChart({
    data,
    height = 300,
    showGrid = true,
    stacked = false,
    showSecondary = false,
    valueUnit = "DKK",
    primaryLabel = "Værdi",
    secondaryLabel = "Sekundær",
    barRadius = 6,
}: BarChartProps): JSX.Element {
    const hasCustomColors = data.some((d) => d.color);

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RechartsBarChart data={data} margin={CHART_CONFIG.margin}>
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
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ paddingTop: 12, fontSize: 13 }}
                    />
                )}
                {showSecondary && (
                    <Bar
                        dataKey="secondary"
                        name={secondaryLabel}
                        fill={CHART_COLORS.secondary}
                        radius={[barRadius, barRadius, 0, 0]}
                        stackId={stacked ? "stack" : undefined}
                        animationDuration={CHART_CONFIG.animation.duration}
                    />
                )}
                <Bar
                    dataKey="value"
                    name={primaryLabel}
                    fill={CHART_COLORS.primary}
                    radius={[barRadius, barRadius, 0, 0]}
                    stackId={stacked ? "stack" : undefined}
                    animationDuration={CHART_CONFIG.animation.duration}
                >
                    {hasCustomColors &&
                        data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color ?? CHART_COLORS.primary}
                            />
                        ))}
                </Bar>
            </RechartsBarChart>
        </ResponsiveContainer>
    );
}
