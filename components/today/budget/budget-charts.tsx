"use client";
 
import { TrendingUp, BriefcaseBusiness } from "lucide-react";

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-brand-border/40 bg-white/50 backdrop-blur-md shadow-soft overflow-hidden group">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-[0.15em] text-brand-text3">Til rådighed over tid</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-brand-accent/5 flex items-center justify-center">
                            <TrendingUp size={14} className="text-brand-accent" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px] w-full pt-4">
                        <WealthAreaChart 
                           data={disposableData} 
                           height={320}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-brand-border/40 bg-white/50 backdrop-blur-md shadow-soft overflow-hidden group">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold uppercase tracking-[0.15em] text-brand-text3">Allokering pr. måned</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-brand-success/10 flex items-center justify-center">
                            <BriefcaseBusiness size={14} className="text-brand-success" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[320px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={allocationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.6}/>
                                    </linearGradient>
                                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0.6}/>
                                    </linearGradient>
                                    <linearGradient id="colorResidual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0.6}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                                <XAxis 
                                    dataKey="label" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: CHART_COLORS.textMuted, fontSize: 10, fontWeight: 600 }} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: CHART_COLORS.textMuted, fontSize: 10 }} 
                                    tickFormatter={formatChartLabel} 
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                    }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                                    formatter={(value: any) => [formatChartValue(value, "DKK"), ""]}
                                />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    iconType="circle" 
                                    iconSize={6} 
                                    wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '20px' }} 
                                />
                                <Bar dataKey="invest" name="Investering" stackId="a" fill="url(#colorInvest)" radius={[2, 2, 0, 0]} barSize={32} />
                                <Bar dataKey="savings" name="Løbende opsparing" stackId="a" fill="url(#colorSavings)" radius={[2, 2, 0, 0]} barSize={32} />
                                <Bar dataKey="residual" name="Overskydende cash" stackId="a" fill="url(#colorResidual)" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
