"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { ALLOCATION_PALETTE, CHART_COLORS, CHART_CONFIG, formatChartValue } from "./chart-theme";

export interface HorizontalBarDataPoint {
    name: string;
    value: number;
    color?: string;
}

interface HorizontalBarChartProps {
    data: HorizontalBarDataPoint[];
    height?: number;
    valueUnit?: "DKK" | "%" | "number";
    barHeight?: number;
    showValues?: boolean;
}

export function HorizontalBarChart({
    data,
    height,
    valueUnit = "DKK",
    barHeight = 32,
    showValues = true,
}: HorizontalBarChartProps) {
    const calculatedHeight = height ?? Math.max(200, data.length * (barHeight + 12) + 40);

    return (
        <ResponsiveContainer width="100%" height={calculatedHeight}>
            <BarChart
                data={data}
                layout="vertical"
                margin={{ ...CHART_CONFIG.margin, left: 100 }}
            >
                <XAxis
                    type="number"
                    axisLine={{ stroke: CHART_COLORS.grid }}
                    tickLine={false}
                    tick={{ fill: CHART_COLORS.textMuted, fontSize: 12 }}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: CHART_COLORS.text, fontSize: 13 }}
                    width={90}
                />
                <Tooltip
                    contentStyle={CHART_CONFIG.tooltip.contentStyle}
                    formatter={(value: number) => [formatChartValue(value, valueUnit), ""]}
                />
                <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    barSize={barHeight}
                    animationDuration={CHART_CONFIG.animation.duration}
                    label={
                        showValues
                            ? {
                                position: "right",
                                fill: CHART_COLORS.textMuted,
                                fontSize: 12,
                                formatter: (value: number) => formatChartValue(value, valueUnit),
                            }
                            : false
                    }
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.color ?? ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length]}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
