"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ALLOCATION_PALETTE, CHART_CONFIG, formatChartValue } from "./chart-theme";

export interface DonutChartDataPoint {
    name: string;
    value: number;
    color?: string;
}

interface DonutChartProps {
    data: DonutChartDataPoint[];
    height?: number;
    innerRadius?: number;
    outerRadius?: number;
    showLegend?: boolean;
    showLabels?: boolean;
    centerLabel?: string;
    centerValue?: string;
    valueUnit?: "DKK" | "%" | "number";
}

export function DonutChart({
    data,
    height = 280,
    innerRadius = 60,
    outerRadius = 90,
    showLegend = true,
    showLabels = false,
    centerLabel,
    centerValue,
    valueUnit = "DKK",
}: DonutChartProps): JSX.Element {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        paddingAngle={2}
                        dataKey="value"
                        animationDuration={CHART_CONFIG.animation.duration}
                        label={
                            showLabels
                                ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
                                : false
                        }
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color ?? ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length]}
                                stroke="none"
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={CHART_CONFIG.tooltip.contentStyle}
                        formatter={(value: number, name: string) => {
                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                            return [`${formatChartValue(value, valueUnit)} (${percent}%)`, name];
                        }}
                    />
                    {showLegend && (
                        <Legend
                            layout="horizontal"
                            align="center"
                            verticalAlign="bottom"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{
                                paddingTop: 16,
                                fontSize: 13,
                            }}
                            formatter={(value) => (
                                <span className="text-brand-text2">{value}</span>
                            )}
                        />
                    )}
                </PieChart>
            </ResponsiveContainer>
            {(centerLabel || centerValue) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {centerValue && (
                        <span className="text-xl font-semibold text-brand-text1 tabular-nums">
                            {centerValue}
                        </span>
                    )}
                    {centerLabel && (
                        <span className="text-xs text-brand-text2 uppercase tracking-wide">
                            {centerLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
