"use client";

import { useProjectionModel } from "@/hooks/use-projection-model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Landmark, Wallet, AlertCircle, Inbox, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchJson } from "@/lib/client";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { StatusChip } from "@/components/shared/status-chip";
import { SecurityLogo } from "@/src/components/SecurityLogo";
import { DonutChart } from "@/components/charts/donut-chart";
import { WealthBarChart } from "@/components/charts/bar-chart";

interface HoldingsBucket {
    key: string;
    label: string;
    valueDKK: number;
    positions: any[];
}

interface HoldingsResponse {
    asOfDate: string;
    totals: {
        portfolioValueDKK: number;
        cashDKK: number;
        netWorthDKK: number;
        suDebtDKK: number;
        totalDebtDKK: number;
    };
    buckets: HoldingsBucket[];
    status: {
        missingPrices: number;
        hasHoldings: boolean;
    };
    debts?: any[]; // Detailed debt info
}

import { PriceRefresher } from "@/components/holdings/price-refresher";

export function SnapshotView() {
    const { projection, loading: projectionLoading } = useProjectionModel();
    const [holdingsData, setHoldingsData] = useState<HoldingsResponse | null>(null);
    const [holdingsLoading, setHoldingsLoading] = useState(true);

    useEffect(() => {
        fetchJson<HoldingsResponse>("/api/holdings")
            .then(setHoldingsData)
            .catch(err => console.error("Failed to fetch holdings", err))
            .finally(() => setHoldingsLoading(false));
    }, []);

    if (projectionLoading || holdingsLoading || !holdingsData) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading snapshot...</div>;
    }

    const { totals, buckets, status, asOfDate } = holdingsData;
    // Debts are now fetched from the API
    const debts = totals.totalDebtDKK || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Net Worth</h2>
                    <p className="text-sm text-muted-foreground">Real-time overview of your assets and liabilities derived from imported data.</p>
                </div>
                <PriceRefresher />
            </div>

            {/* KPI Cards */}
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Net Worth"
                    value={totals.netWorthDKK}
                    subValue={`As of ${asOfDate}`}
                    icon={Wallet}
                    bgImage="/images/backgrounds/bg_net_worth_premium_1770907371717.png"
                    trendData={[40, 35, 50, 45, 60, 55, 70]}
                />
                <KpiCard
                    title="Cash"
                    value={totals.cashDKK}
                    icon={DollarSign}
                    bgImage="/images/backgrounds/bg_cash_premium_1770907484064.png"
                    trendData={[10, 20, 15, 25, 20, 30, 25]}
                />
                <KpiCard
                    title="Portfolio"
                    value={totals.portfolioValueDKK}
                    icon={TrendingUp}
                    status={status.missingPrices > 0 ? "WARNING" : "SUCCESS"}
                    statusLabel={status.missingPrices > 0 ? `${status.missingPrices} missing prices` : "All prices OK"}
                    bgImage="/images/backgrounds/bg_portfolio_premium_1770907405501.png"
                    trendData={[30, 40, 35, 50, 45, 60, 65]}
                />
                <KpiCard
                    title="Total Debt"
                    value={debts}
                    icon={Landmark}
                    inverse
                    bgImage="/images/backgrounds/bg_debt_premium_1770907508666.png"
                    trendData={[70, 65, 60, 55, 50, 45, 40]}
                />

            </div>

            {/* Charts Section */}
            {status.hasHoldings && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-brand-border/40 bg-brand-surface/30 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-brand-primary" />
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-brand-text2">
                                    Asset Allocation
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <DonutChart
                                data={buckets.map(b => ({ name: b.label, value: b.valueDKK }))}
                                height={240}
                                showLegend={true}
                                innerRadius={60}
                                outerRadius={80}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-brand-border/40 bg-brand-surface/30 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-brand-accent" />
                                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-brand-text2">
                                    Balance Sheet Summary
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <WealthBarChart
                                data={[
                                    { label: 'Assets', value: totals.portfolioValueDKK + totals.cashDKK, color: '#10b981' },
                                    { label: 'Liabilities', value: totals.totalDebtDKK, color: '#f43f5e' }
                                ]}
                                height={240}
                                showSecondary={false}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {!status.hasHoldings ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <Inbox className="h-12 w-12 text-brand-text3 mb-4" />
                        <CardTitle className="mb-2">No holdings found</CardTitle>
                        <p className="text-sm text-brand-text3 max-w-xs mb-6">
                            You haven't imported any holdings or transactions yet.
                            Start by importing your data to see your portfolio here.
                        </p>
                        <a
                            href="/input"
                            className="text-sm font-medium text-brand-primary hover:underline"
                        >
                            Go to CSV Import &rarr;
                        </a>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Holdings Detail by Bucket */}
                    <div className="space-y-6">
                        {buckets.map((bucket) => (
                            <Card key={bucket.key}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-brand-text2">
                                            {bucket.label}
                                        </CardTitle>
                                        <span className="text-sm font-bold text-brand-text1">
                                            {formatCurrency(bucket.valueDKK)}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-brand-text2 uppercase border-b border-brand-border/50">
                                                <tr>
                                                    <th className="py-2 pr-4 font-medium">Papir</th>
                                                    <th className="py-2 px-2 text-right font-medium">Antal</th>
                                                    <th className="py-2 px-2 text-right font-medium">GAK</th>
                                                    <th className="py-2 px-2 text-right font-medium">Kurs</th>
                                                    <th className="py-2 pl-4 text-right font-medium">Værdi (DKK)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-border/30">
                                                {bucket.positions.map((p, i) => (
                                                    <tr key={i} className="group hover:bg-brand-surface/30">
                                                        <td className="py-3 pr-4">
                                                            <div className="flex items-center gap-3">
                                                                <SecurityLogo
                                                                    identifier={(p.ticker || p.name) ?? "Unknown"}
                                                                    name={p.name}
                                                                    type={bucket.key.toLowerCase().includes('crypto') || bucket.key.toLowerCase().includes('krypto') ? 'crypto' : 'stock'}
                                                                    size={32}
                                                                    className="shrink-0 rounded-lg bg-brand-surface2 border border-brand-border/50 p-1"
                                                                />
                                                                <div className="flex flex-col min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-brand-text1 truncate max-w-[150px] sm:max-w-[200px]">
                                                                            {p.name || p.ticker}
                                                                        </span>
                                                                        <span title="Using GAK fallback">
                                                                            <AlertCircle className="h-3 w-3 text-brand-warning shrink-0" />
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[10px] text-brand-text3">
                                                                        {p.ticker}  • {p.currency}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2 text-right tabular-nums text-brand-text2">
                                                            {p.quantity.toLocaleString('da-DK')}
                                                        </td>
                                                        <td className="py-3 px-2 text-right tabular-nums text-brand-text2">
                                                            {new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.avgCost)}
                                                        </td>
                                                        <td className="py-3 px-2 text-right tabular-nums">
                                                            <div className={cn("text-brand-text1", p.missingPrice && "italic text-brand-text3")}>
                                                                {new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p.price)}
                                                            </div>
                                                            {!p.missingPrice && p.priceDate && (
                                                                <div className="text-[10px] text-brand-text3 text-nowrap">
                                                                    {p.priceDate}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pl-4 text-right font-medium tabular-nums text-brand-text1">
                                                            {formatCurrency(p.valueDKK)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Right column could be Debt or Allocation Summary */}
                    {/* Right column: Liabilities */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-brand-text2">
                                            Liabilities
                                        </CardTitle>
                                        <div className="text-[10px] text-brand-text3 mt-0.5">
                                            Imported debts & terms
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-brand-danger">
                                        {formatCurrency(debts)}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {holdingsData.debts && holdingsData.debts.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-brand-text2 uppercase border-b border-brand-border/50">
                                                <tr>
                                                    <th className="py-2 pr-4 font-medium">Lån</th>
                                                    <th className="py-2 px-2 text-right font-medium">Restgæld</th>
                                                    <th className="py-2 px-2 text-right font-medium">Rente (Årlig)</th>
                                                    <th className="py-2 px-2 text-right font-medium">Afvikling</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-border/30">
                                                {holdingsData.debts.map((debt: any, i: number) => (
                                                    <tr key={i} className="group hover:bg-brand-surface/30">
                                                        <td className="py-3 pr-4 font-medium text-brand-text1">
                                                            <div>{debt.name}</div>
                                                            <div className="text-[10px] text-brand-text3">{debt.kind}</div>
                                                        </td>
                                                        <td className="py-3 px-2 text-right tabular-nums text-brand-text1">
                                                            {formatCurrency(debt.balance)}
                                                        </td>
                                                        <td className="py-3 px-2 text-right tabular-nums text-brand-text2">
                                                            {(debt.interestRate * 100).toFixed(2)}%
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-brand-text2 text-xs">
                                                            {debt.paymentPeriodYears ? (
                                                                <div className="flex flex-col items-end">
                                                                    <span>{debt.paymentPeriodYears} år</span>
                                                                    {debt.repaymentStartDate && (
                                                                        <span className="text-[10px] text-brand-text3">Start: {debt.repaymentStartDate}</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                "Ukendt"
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-sm text-brand-text3 py-4 text-center border border-dashed rounded-md">
                                        No active liabilities found.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

function KpiCard({
    title,
    value,
    subValue,
    icon: Icon,
    status,
    statusLabel,
    inverse,
    bgImage,
    trendData
}: {
    title: string;
    value: number;
    subValue?: string;
    icon: any;
    status?: "SUCCESS" | "WARNING" | "DANGER";
    statusLabel?: string;
    inverse?: boolean;
    bgImage?: string;
    trendData?: number[];
}) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };
    return (
        <Card
            className={cn(
                "relative overflow-hidden border-brand-border/40 bg-brand-surface/20 backdrop-blur-xl shadow-lg transition-all duration-500 hover:border-brand-primary/30 group",
                bgImage && "text-brand-text1"
            )}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background Texture */}
            {bgImage && (
                <div
                    className="absolute inset-0 z-0 opacity-[0.14] pointer-events-none transition-transform duration-700 group-hover:scale-105"
                    style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
            )}

            {/* Mouse Glow Effect */}
            <div
                className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-500"
                style={{
                    opacity: isHovered ? 1 : 0,
                    background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(var(--brand-primary-rgb), 0.08), transparent 80%)`,
                }}
            />

            <CardContent className="relative z-20 p-6 flex flex-col h-full">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-text2/70">{title}</p>
                    <div className="rounded-full bg-brand-surface2/50 p-2 border border-brand-border/10">
                        <Icon className="h-4 w-4 text-brand-primary" />
                    </div>
                </div>

                <div className="flex flex-col gap-1 flex-1 justify-center py-2">
                    <div className={cn(
                        "text-2xl font-bold tabular-nums tracking-tight",
                        inverse ? (value > 0 ? "text-brand-danger" : "text-brand-text1") : "text-brand-text1"
                    )}>
                        {formatCurrency(value)}
                    </div>
                    {subValue && (
                        <div className="text-[10px] text-brand-text3 font-medium uppercase tracking-tighter opacity-70">
                            {subValue}
                        </div>
                    )}
                </div>

                {/* Bottom Section: Status and Sparkline */}
                <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                        {status && (
                            <div className="flex items-center gap-1.5">
                                <StatusChip status={status} />
                                {statusLabel && (
                                    <span className="text-[10px] text-brand-text3 font-medium">
                                        {statusLabel}
                                    </span>
                                )}
                            </div>
                        )}
                        {!status && <div className="h-[18px]" />}
                    </div>

                    {/* Subtle Sparkline */}
                    {trendData && (
                        <div className="h-8 w-16 opacity-40 group-hover:opacity-80 transition-opacity">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData.map((v, i) => ({ v, i }))}>
                                    <defs>
                                        <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="v"
                                        stroke="var(--brand-primary)"
                                        strokeWidth={1.5}
                                        fill={`url(#grad-${title.replace(/\s+/g, '')})`}
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Add these to make the AreaChart work in KpiCard
import { AreaChart, Area, ResponsiveContainer } from "recharts";

