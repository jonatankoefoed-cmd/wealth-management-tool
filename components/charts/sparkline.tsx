"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { useMemo } from "react";

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    className?: string;
}

export function Sparkline({ data, color = "#10B981", height = 40, className }: SparklineProps) {
    const chartData = useMemo(() => {
        return data.map((val, i) => ({ i, val }));
    }, [data]);

    if (!data || data.length < 2) return null;

    const isPositive = data[data.length - 1] >= data[0];
    const strokeColor = color || (isPositive ? "#10B981" : "#EF4444");

    return (
        <div className={className} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Line
                        type="monotone"
                        dataKey="val"
                        stroke={strokeColor}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
