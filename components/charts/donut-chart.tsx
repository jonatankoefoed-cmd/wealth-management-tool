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
}: DonutChartProps) {
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
                        paddingAngle={3}
                        dataKey="value"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={1}
                        animationDuration={CHART_CONFIG.animation.duration}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color ?? ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length]}
                                className="transition-opacity duration-300 hover:opacity-80 cursor-pointer outline-none"
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            ...CHART_CONFIG.tooltip.contentStyle,
                            borderRadius: '12px',
                            border: '1px solid rgba(0,0,0,0.05)',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            padding: '10px 14px'
                        }}
                        cursor={{ fill: 'transparent' }}
                        formatter={(value: any, name: any) => {
                            const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
                            return [
                                <span key="val" className="font-semibold text-brand-text1">{formatChartValue(value, valueUnit)}</span>,
                                <span key="name" className="text-brand-text2 text-xs">{name} ({percent}%)</span>
                            ];
                        }}
                    />
                    {showLegend && (
                        <Legend
                            layout="horizontal"
                            align="center"
                            verticalAlign="bottom"
                            iconType="circle"
                            iconSize={6}
                            wrapperStyle={{
                                paddingTop: 24,
                                fontSize: 11,
                                opacity: 0.8
                            }}
                            formatter={(value) => (
                                <span className="text-brand-text2 font-medium hover:text-brand-text1 transition-colors">{value}</span>
                            )}
                        />
                    )}
                </PieChart>
            </ResponsiveContainer>
            {(centerLabel || centerValue) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-[-12px]">
                    {centerValue && (
                        <span className="text-2xl font-bold tracking-tight text-brand-text1 tabular-nums">
                            {centerValue.replace(" kr.", "")}
                            <span className="ml-1 text-sm font-medium text-brand-text3">kr</span>
                        </span>
                    )}
                    {centerLabel && (
                        <span className="text-[10px] text-brand-text3 uppercase tracking-[0.2em] font-medium mt-0.5">
                            {centerLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
