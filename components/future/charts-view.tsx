"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDKK } from "@/lib/format";

interface ChartsViewProps {
    data?: {
        years: {
            calendarYear: number;
            typicalMonth: {
                netDisposable: number;
                allocations: {
                    invest: number;
                    liquidSavings: number;
                    residual: number;
                };
                income: { total: number };
                expenses: { total: number };
                tax: { total: number };
            };
        }[];
    } | null;
}

export function ChartsView({ data }: ChartsViewProps) {
    if (!data) {
        return <div className="p-8 text-center text-sm text-muted-foreground">No data available for charts.</div>;
    }

    const chartData = data.years.map(y => ({
        year: y.calendarYear,
        NetDisposable: Math.round(y.typicalMonth.netDisposable),
        Invest: Math.round(y.typicalMonth.allocations.invest),
        Savings: Math.round(y.typicalMonth.allocations.liquidSavings),
        Residual: Math.round(y.typicalMonth.allocations.residual),
        TotalIncome: Math.round(y.typicalMonth.income.total),
        TotalExpenses: Math.round(y.typicalMonth.expenses.total + y.typicalMonth.tax.total), // Expenses + Tax
        ExpensesOnly: Math.round(y.typicalMonth.expenses.total),
        TaxOnly: Math.round(y.typicalMonth.tax.total),
    }));

    return (
        <div className="space-y-6 animate-fade-in-up">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Net Disposable Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Net Disposable Income Trend</CardTitle>
                        <CardDescription>Monthly amount available after tax & expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val / 1000}k`}
                                    />
                                    <Tooltip
                                        formatter={(val: number) => formatDKK(val)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="NetDisposable" stroke="#10b981" fillOpacity={1} fill="url(#colorNet)" name="Net Disposable" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Allocation Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Monthly Allocation</CardTitle>
                        <CardDescription>How the surplus is distributed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `${val / 1000}k`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        formatter={(val: number) => formatDKK(val)}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Savings" stackId="a" fill="#3b82f6" name="Liquid Savings" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="Invest" stackId="a" fill="#8b5cf6" name="Investments" />
                                    <Bar dataKey="Residual" stackId="a" fill="#f59e0b" name="Unallocated" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Income vs Outflow */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Income vs Total Outflow</CardTitle>
                    <CardDescription>Gross Income compared to Tax + Expenses</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val / 1000}k`}
                                />
                                <Tooltip
                                    formatter={(val: number) => formatDKK(val)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="TotalIncome" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" name="Gross Income" />
                                <Area type="monotone" dataKey="TotalExpenses" stroke="#ef4444" fillOpacity={0.1} fill="#ef4444" name="Tax + Expenses" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
