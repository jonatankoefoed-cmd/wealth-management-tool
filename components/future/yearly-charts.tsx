"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, AreaChart, Area } from "recharts";
import { formatDKK } from "@/lib/format";

interface YearlyChartsProps {
    data: {
        years: {
            calendarYear: number;
            pnl: {
                netDisposable: number;
                tax: { total: number };
                allocations: { invest: number; liquidSavings: number; residual: number };
            };
        }[];
    };
}

export function YearlyCharts({ data }: YearlyChartsProps) {
    const chartData = data.years.map(y => ({
        year: y.calendarYear,
        NetDisposable: y.pnl.netDisposable,
        Tax: y.pnl.tax.total,
        Invest: y.pnl.allocations.invest,
        Savings: y.pnl.allocations.liquidSavings,
        Residual: y.pnl.allocations.residual,
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Net Disposable & Tax Trend */}
            <Card className="rounded-xl border-brand-border bg-brand-surface shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-brand-text1">Net Income & Tax Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorTax" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                </linearGradient>
                                <filter id="shadow" height="200%">
                                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                                    <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
                                    <feComponentTransfer>
                                        <feFuncA type="linear" slope="0.3" />
                                    </feComponentTransfer>
                                    <feMerge>
                                        <feMergeNode />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />

                            <XAxis
                                dataKey="year"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                                labelStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}
                                formatter={(val: number) => formatDKK(val) as any}
                            />

                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line
                                type="monotone"
                                dataKey="NetDisposable"
                                name="Net Disposable"
                                stroke="#16a34a"
                                strokeWidth={3}
                                dot={{ fill: '#16a34a', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                filter="url(#shadow)"
                            />
                            <Line
                                type="monotone"
                                dataKey="Tax"
                                name="Total Tax"
                                stroke="#dc2626"
                                strokeWidth={3}
                                dot={{ fill: '#dc2626', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                filter="url(#shadow)"
                            />

                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Allocation Stacked Bar */}
            <Card className="rounded-xl border-brand-border bg-brand-surface shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-brand-text1">Annual Allocations</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} stackOffset="sign">
                            <defs>
                                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6} />
                                </linearGradient>
                                <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6} />
                                </linearGradient>
                                <linearGradient id="colorResidual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.9} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />

                            <XAxis
                                dataKey="year"
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                                labelStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}
                                formatter={(val: number) => formatDKK(val) as any}
                            />

                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="Savings" name="Liquid Savings" stackId="a" fill="url(#colorSavings)" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="Invest" name="Investments" stackId="a" fill="url(#colorInvest)" />
                            <Bar dataKey="Residual" name="Residual / Surplus" stackId="a" fill="url(#colorResidual)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
