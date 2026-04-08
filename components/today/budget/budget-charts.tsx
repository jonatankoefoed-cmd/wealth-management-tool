"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts";
import {
    CHART_COLORS,
    CHART_CONFIG,
    formatChartLabel,
    formatChartValue
} from "@/components/charts/chart-theme";
import { WealthAreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartDataPoint {
    label: string;
    invest: number;
    savings: number;
    residual: number;
}

interface BudgetChartsProps {
    months: any[];
    yearly: any;
}

export function BudgetCharts({ months, yearly }: BudgetChartsProps) {
    const allocationData = months.map(m => ({
        label: new Date(m.monthKey).toLocaleDateString("da-DK", { month: "short" }),
        invest: m.allocations.invest,
        savings: m.allocations.liquidSavings,
        residual: m.allocations.residual,
    }));

    const disposableData = months.map(m => ({
        label: new Date(m.monthKey).toLocaleDateString("da-DK", { month: "short" }),
        value: m.netDisposable,
    }));

    const taxDonutData = yearly.taxTotal > 0 ? [
        { name: "Personskat", value: yearly.taxTotal * 0.9 }, // Simplified breakdown for visual
        { name: "AM-bidrag", value: yearly.taxTotal * 0.08 },
        { name: "Andet", value: yearly.taxTotal * 0.02 },
    ] : [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Til rådighed over tid</CardTitle>
                </CardHeader>
                <CardContent>
                    <WealthAreaChart data={disposableData} height={250} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Allokering pr. måned</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={allocationData} margin={CHART_CONFIG.margin}>
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                            <XAxis dataKey="label" axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} tick={{ fill: CHART_COLORS.textMuted, fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.textMuted, fontSize: 11 }} tickFormatter={formatChartLabel} />
                            <Tooltip
                                contentStyle={CHART_CONFIG.tooltip.contentStyle}
                                formatter={(value: number) => [formatChartValue(value, "DKK"), ""]}
                            />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                            <Bar dataKey="invest" name="Investering" stackId="a" fill={CHART_COLORS.primary} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="savings" name="Likvid opsparing" stackId="a" fill={CHART_COLORS.success} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="residual" name="Overskydende cash" stackId="a" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
