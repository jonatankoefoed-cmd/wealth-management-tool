"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchJson } from "@/lib/client";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
    Calculator,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    Info,
    Receipt,
    Wallet,
    PiggyBank
} from "lucide-react";
import { cn } from "@/lib/cn";
import { StatusChip } from "@/components/shared/status-chip";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from "recharts";

interface BudgetData {
    year: number;
    income: {
        monthlyGross: number;
        yearlyGross: number;
        source: string;
    };
    expenses: {
        monthlyTotal: number;
        yearlyTotal: number;
        categories: Record<string, number>;
        count: number;
    };
    tax: {
        monthlyTotal: number;
        yearlyTotal: number;
        breakdown: any;
        audit: any;
    };
    net: {
        monthlyDisposable: number;
        yearlyDisposable: number;
    };
}

export function BudgetView() {
    const [data, setData] = useState<BudgetData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTaxExplain, setShowTaxExplain] = useState(false);

    useEffect(() => {
        fetchJson<BudgetData>("/api/budget")
            .then(setData)
            .catch(err => console.error("Failed to fetch budget", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !data) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading budget run-rate...</div>;
    }

    const chartData = [
        { name: "Gross Income", value: data.income.monthlyGross, fill: "var(--brand-accent)" },
        { name: "Tax", value: data.tax.monthlyTotal, fill: "var(--brand-danger)" },
        { name: "Expenses", value: data.expenses.monthlyTotal, fill: "var(--brand-text3)" },
        { name: "Net Disposable", value: data.net.monthlyDisposable, fill: "var(--brand-success)" },
    ];

    const pieData = Object.entries(data.expenses.categories).map(([name, value]) => ({
        name,
        value
    }));

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <BudgetKpi
                    title="Monthly Gross"
                    value={data.income.monthlyGross}
                    icon={Receipt}
                    subLabel={`Source: ${data.income.source}`}
                />
                <BudgetKpi
                    title="Est. Monthly Tax"
                    value={data.tax.monthlyTotal}
                    icon={ShieldCheck}
                    status="SUCCESS"
                    onClickLabel="Explain Tax"
                    onClick={() => setShowTaxExplain(true)}
                />
                <BudgetKpi
                    title="Monthly Expenses"
                    value={data.expenses.monthlyTotal}
                    icon={ArrowDownRight}
                    subLabel={`${data.expenses.count} line items`}
                />
                <BudgetKpi
                    title="Disposable"
                    value={data.net.monthlyDisposable}
                    icon={PiggyBank}
                    highlight
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Waterfall Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Monthly Cashflow Breakdown</CardTitle>
                        <CardDescription>Visualizing how your gross income is allocated.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--brand-border)" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--brand-text2)', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--brand-surface)', borderColor: 'var(--brand-border)' }}
                                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Expense Categories */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Expense Categories</CardTitle>
                        <CardDescription>Top spending groups this month.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`hsl(var(--brand-accent-hsl) / ${1 - index * 0.2})`} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 space-y-2">
                            {pieData.slice(0, 4).map((cat, i) => (
                                <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-brand-text2">{cat.name}</span>
                                    <span className="font-medium">{formatCurrency(cat.value)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Fiscal Year Run-rate (2026)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Monthly</TableHead>
                                <TableHead className="text-right">Yearly</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium text-brand-text1">Gross Income</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(data.income.monthlyGross)}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatCurrency(data.income.yearlyGross)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-brand-text2 italic pl-6">Estimated Income Tax</TableCell>
                                <TableCell className="text-right tabular-nums text-brand-danger">-{formatCurrency(data.tax.monthlyTotal)}</TableCell>
                                <TableCell className="text-right tabular-nums text-brand-danger">-{formatCurrency(data.tax.yearlyTotal)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-brand-text2 italic pl-6">Household & Personal Expenses</TableCell>
                                <TableCell className="text-right tabular-nums text-brand-text2">-{formatCurrency(data.expenses.monthlyTotal)}</TableCell>
                                <TableCell className="text-right tabular-nums text-brand-text2">-{formatCurrency(data.expenses.yearlyTotal)}</TableCell>
                            </TableRow>
                            <TableRow className="bg-brand-accent/5">
                                <TableCell className="font-bold text-brand-primary">Net Disposable Income</TableCell>
                                <TableCell className="text-right font-bold tabular-nums text-brand-primary">{formatCurrency(data.net.monthlyDisposable)}</TableCell>
                                <TableCell className="text-right font-bold tabular-nums text-brand-primary">{formatCurrency(data.net.yearlyDisposable)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Tax Explanation Drawer (Simplified Modal) */}
            {showTaxExplain && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl border-brand-accent/20">
                        <CardHeader className="sticky top-0 bg-brand-surface border-b z-10">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Tax Calculation Audit</CardTitle>
                                    <CardDescription>Step-by-step breakdown from the Danish Tax Engine.</CardDescription>
                                </div>
                                <button
                                    onClick={() => setShowTaxExplain(false)}
                                    className="p-2 hover:bg-brand-surface2 rounded-full transition-colors"
                                >
                                    <Info className="h-5 w-5 text-brand-text3 rotate-180" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {data.tax.audit.steps.map((step: any, i: number) => (
                                <div key={i} className="flex justify-between items-start border-b border-brand-border/40 pb-4 last:border-0 last:pb-0">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-brand-text1">{step.label}</p>
                                        <p className="text-[11px] text-brand-text3 font-mono bg-brand-surface2 px-1.5 py-0.5 rounded">{step.formula}</p>
                                    </div>
                                    <div className="text-sm font-bold tabular-nums">
                                        {formatCurrency(step.value)} {step.unit === 'DKK' ? '' : step.unit}
                                    </div>
                                </div>
                            ))}

                            <div className="bg-brand-accent/10 p-4 rounded-lg flex justify-between items-center border border-brand-accent/20">
                                <span className="font-bold text-brand-primary">Total Yearly Tax</span>
                                <span className="text-xl font-bold text-brand-primary">{formatCurrency(data.tax.yearlyTotal)}</span>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text3">Notes & Assumptions</h4>
                                <ul className="list-disc list-inside text-xs text-brand-text2 space-y-1">
                                    {data.tax.audit.notes.map((note: string, i: number) => (
                                        <li key={i}>{note}</li>
                                    ))}
                                    <li>Standard COP municipality rate assumed (25.05%).</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function BudgetKpi({
    title,
    value,
    icon: Icon,
    subLabel,
    status,
    onClickLabel,
    onClick,
    highlight
}: {
    title: string;
    value: number;
    icon: any;
    subLabel?: string;
    status?: "SUCCESS" | "WARNING";
    onClickLabel?: string;
    onClick?: () => void;
    highlight?: boolean;
}) {
    return (
        <Card className={cn(
            "border-brand-border/50 bg-brand-surface/50 shadow-sm transition-all hover:border-brand-border",
            highlight && "border-brand-accent/30 bg-brand-accent/5 ring-1 ring-brand-accent/10"
        )}>
            <CardContent className="p-5">
                <div className="flex items-center justify-between pb-2">
                    <p className="text-xs font-medium text-brand-text2 uppercase tracking-wide">{title}</p>
                    <div className={cn(
                        "p-1.5 rounded-lg",
                        highlight ? "bg-brand-accent text-brand-textInvert" : "bg-brand-surface2 text-brand-text3"
                    )}>
                        <Icon className="h-3.5 w-3.5" />
                    </div>
                </div>
                <div className="space-y-1">
                    <div className={cn(
                        "text-xl font-bold tabular-nums",
                        highlight ? "text-brand-primary" : "text-brand-text1"
                    )}>
                        {formatCurrency(value)}
                    </div>
                    {(subLabel || status) && (
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-brand-text3">{subLabel}</span>
                            {status && <StatusChip status={status} />}
                        </div>
                    )}
                    {onClickLabel && (
                        <button
                            onClick={onClick}
                            className="text-[10px] font-semibold text-brand-primary hover:underline mt-2 flex items-center gap-1"
                        >
                            <Calculator className="h-2.5 w-2.5" />
                            {onClickLabel}
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
