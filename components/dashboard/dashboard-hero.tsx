"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ArrowRight, ArrowUpRight, ArrowDownRight, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { DonutChart } from "@/components/charts/donut-chart";
import { motion } from "framer-motion";

interface DashboardHeroProps {
    netWorth: number;
    projectedNetWorth: number;
    growth: number;
    cash: number;
    portfolioValue: number;
    totalDebt: number;
    className?: string;
}

export function DashboardHero({
    netWorth,
    projectedNetWorth,
    growth,
    cash,
    portfolioValue,
    totalDebt,
    className
}: DashboardHeroProps) {
    const router = useRouter();

    const compositionData = [
        { name: "Liquid Cash", value: cash, color: "#10B981" }, // Emerald 500
        { name: "Investments", value: portfolioValue, color: "#3B82F6" }, // Blue 500
        { name: "Debt", value: totalDebt, color: "#EF4444" }, // Red 500
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className={cn(
                "relative overflow-hidden border-brand-border/50 shadow-soft",
                // Premium gradient background
                "bg-gradient-to-br from-brand-surface2 via-brand-surface to-brand-surface",
                className
            )}>
                {/* Subtle glow effect behind the chart */}
                <div className="absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/2 translate-x-1/3 rounded-full bg-brand-primary/5 blur-3xl" />

                <CardContent className="p-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 h-full">

                        {/* Left Column: Net Worth & Stats */}
                        <div className="flex-1 space-y-8 z-10">
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-text2 mb-2">
                                    Total Net Worth
                                </h2>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-5xl font-bold tracking-tight text-brand-text1 tabular-nums">
                                        {formatDKK(netWorth)}
                                    </span>
                                    <span className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium border",
                                        growth >= 0
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    )}>
                                        {growth >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                                        {Math.abs(growth).toFixed(0)}% to target
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-brand-text3">
                                    Target: <span className="font-medium text-brand-text2">{formatDKK(projectedNetWorth)}</span> (10Y Projection)
                                </p>
                            </div>

                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-3 gap-6 border-t border-brand-border/60 pt-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-brand-text3 mb-1">Liquidity</p>
                                    <p className="text-lg font-semibold text-brand-text1 tabular-nums">{formatDKK(cash)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-brand-text3 mb-1">Investments</p>
                                    <p className="text-lg font-semibold text-brand-text1 tabular-nums">{formatDKK(portfolioValue)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-brand-text3 mb-1">Liabilities</p>
                                    <p className="text-lg font-semibold text-brand-text1 tabular-nums opacity-80">{formatDKK(totalDebt)}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                                <Button
                                    className="gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/20"
                                    onClick={() => router.push('/today')}
                                >
                                    View Breakdown <ArrowRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="gap-2 text-brand-text2 hover:text-brand-text1"
                                    onClick={() => router.push('/future')}
                                >
                                    Forecast <TrendingUp className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Right Column: Chart */}
                        <div className="relative hidden w-[280px] lg:block">
                            <div className="absolute inset-0 bg-gradient-to-l from-brand-surface2/50 to-transparent rounded-xl" />
                            <div className="relative z-10 flex flex-col items-center justify-center p-4">
                                <div className="h-[200px] w-full">
                                    <DonutChart
                                        data={compositionData}
                                        showLegend={false}
                                        valueUnit="DKK"
                                        height={200}
                                        innerRadius={60}
                                        outerRadius={80}
                                    />
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-sm font-medium text-brand-text2 flex items-center justify-center gap-2">
                                        <PieChartIcon className="h-4 w-4 text-brand-text3" />
                                        Asset Allocation
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
