"use client";

import React, { useState, useEffect } from "react";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    HelpCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { fetchJson } from "@/lib/client";
import { cn } from "@/lib/cn";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---

interface BalanceSheetYear {
    yearIndex: number;
    calendarYear: number;
    eoy: {
        assets: {
            cashDKK: number | null;
            portfolioDKK: number | null;
            housingDKK: number | null;
        };
        liabilities: {
            suDebtDKK: number | null;
            housingLoanDKK: number | null;
            otherDebtDKK: number | null;
        };
        netWorthDKK: number | null;
    };
    reconciliation: {
        ok: boolean;
        notes: string[];
        components: Array<{
            key: string;
            label: string;
            value: number | null;
            status?: "ok" | "not_modeled";
        }>;
    };
    notes: string[];
}

interface BalanceSheetResponse {
    today: any;
    years: BalanceSheetYear[];
    horizonYears: number;
    dataQuality: {
        ok: boolean;
        missingPrices: boolean;
        missingFX: boolean;
        notModeled: string[];
    };
    lastUpdated: string;
}

// --- Components ---

function StatusChip({ status, label }: { status: "ok" | "warning" | "error"; label: string }) {
    const colors = {
        ok: "bg-brand-success/10 text-brand-success border-brand-success/20",
        warning: "bg-brand-warning/10 text-brand-warning border-brand-warning/20",
        error: "bg-brand-danger/10 text-brand-danger border-brand-danger/20",
    };

    const icons = {
        ok: CheckCircle2,
        warning: AlertTriangle,
        error: XCircle,
    };

    return (
        <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", colors[status])}>
            <Icon icon={icons[status]} size={12} />
            {label}
        </div>
    );
}

function ExplainDrawer({
    year,
    open,
    onOpenChange
}: {
    year: BalanceSheetYear | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!year) return null;

    return (
        <Drawer
            open={open}
            onOpenChange={onOpenChange}
            title={`Balance Sheet Audit: ${year.calendarYear}`}
            description="Reconciliation of Net Worth movement from previous year."
        >
            <div className="mt-4 space-y-6">
                <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
                    <h4 className="mb-4 text-sm font-medium text-brand-text2">Reconciliation Logic</h4>
                    <div className="space-y-3">
                        {year.reconciliation.components.map((comp) => (
                            <div key={comp.key} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-brand-text1">{comp.label}</span>
                                    {comp.status === "not_modeled" && (
                                        <Badge variant="neutral" className="h-5 px-1.5 text-[10px] text-brand-text3 opacity-70">
                                            Not Modeled
                                        </Badge>
                                    )}
                                </div>
                                <span className={cn(
                                    "font-mono",
                                    comp.key === "endNetWorth" ? "font-bold text-brand-text1" : "text-brand-text2"
                                )}>
                                    {formatCurrency(comp.value || 0)}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="my-4 h-px w-full bg-brand-border" />
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-brand-text2">Status</span>
                        <StatusChip
                            status={year.reconciliation.ok ? "ok" : "error"}
                            label={year.reconciliation.ok ? "Reconciled" : "Discrepancy Detected"}
                        />
                    </div>
                    {!year.reconciliation.ok && (
                        <div className="mt-2 text-xs text-brand-danger">
                            {year.reconciliation.notes.join(", ")}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-brand-text1">Explanation</h4>
                    <p className="text-sm text-brand-text2">
                        The End Net Worth is derived by taking the Start Net Worth and adding the sum of all monthly Net Disposable Income (Income - Tax - Expenses) plus any modeled market returns or scenario impacts.
                    </p>
                    <p className="text-sm text-brand-text2">
                        Assets and Liabilities are updated independently based on allocation rules (Liquid Savings &rarr; Cash, Invest &rarr; Portfolio) and debt schedules.
                    </p>
                </div>
            </div>
        </Drawer>
    );
}

export function BalanceSheetView() {
    const [data, setData] = useState<BalanceSheetResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<BalanceSheetYear | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetchJson<BalanceSheetResponse>("/api/future/balance-sheet?horizonYears=10");
                setData(res);
            } catch (e: any) {
                setError(e.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
    if (error) return <div className="p-8 text-brand-danger">Failed to load balance sheet data: {error}</div>;
    if (!data) return null;

    const year0: BalanceSheetYear = {
        yearIndex: 0,
        calendarYear: new Date(data.today.asOfDate).getFullYear(),
        eoy: {
            assets: {
                cashDKK: data.today.assets.cashDKK,
                portfolioDKK: data.today.assets.portfolioValueDKK,
                housingDKK: data.today.assets.housingValueDKK
            },
            liabilities: {
                suDebtDKK: data.today.liabilities.suDebtDKK,
                housingLoanDKK: data.today.liabilities.housingLoanDKK,
                otherDebtDKK: data.today.liabilities.otherDebtDKK
            },
            netWorthDKK: data.today.netWorthDKK
        },
        reconciliation: { ok: true, notes: [], components: [] },
        notes: []
    };

    const displayYears = data.years.find(y => y.yearIndex === 0) ? data.years : [year0, ...data.years];

    return (
        <div className="space-y-8">
            {/* Header & Controls */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-brand-text1">Yearly Balance Sheet</h2>
                    <p className="text-sm text-brand-text2">Projected assets, liabilities and net worth based on current holdings and simulation engine.</p>
                </div>
                <div className="flex gap-2">
                    {data.dataQuality.missingPrices && <StatusChip status="warning" label="Missing Prices" />}
                    {data.dataQuality.missingFX && <StatusChip status="warning" label="Missing FX" />}
                    <span className="text-xs text-brand-text3 items-center flex border-l border-brand-border pl-2 ml-2">
                        Updated: {new Date(data.lastUpdated).toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* Main Matrix Table */}
            <div className="rounded-xl border border-brand-border bg-brand-surface overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead>
                        <tr className="border-b border-brand-border/60 bg-brand-surface2/50">
                            <th className="sticky left-0 z-10 bg-brand-surface2/50 px-4 py-3 font-medium text-brand-text2 backdrop-blur">Component</th>
                            {displayYears.map(y => (
                                <th key={y.yearIndex} className="px-4 py-3 font-medium text-brand-text1 text-right min-w-[120px]">
                                    {y.calendarYear}
                                    {y.yearIndex === 0 && <span className="ml-1.5 text-[10px] text-brand-text3 font-normal">(Today)</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40">
                        {/* ASSETS */}
                        <tr className="bg-brand-surface2/30">
                            <td className="sticky left-0 bg-brand-surface2/30 px-4 py-2 font-semibold text-brand-text1" colSpan={displayYears.length + 1}>Assets</td>
                        </tr>
                        <tr>
                            <td className="sticky left-0 bg-brand-surface px-4 py-2 text-brand-text2">Cash / Liquid</td>
                            {displayYears.map(y => (
                                <td key={y.yearIndex} className="px-4 py-2 text-right text-brand-text1 font-mono">
                                    {formatCurrency(y.eoy.assets.cashDKK || 0)}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="sticky left-0 bg-brand-surface px-4 py-2 text-brand-text2">Portfolio</td>
                            {displayYears.map(y => (
                                <td key={y.yearIndex} className="px-4 py-2 text-right text-brand-text1 font-mono">
                                    {y.eoy.assets.portfolioDKK !== null ? formatCurrency(y.eoy.assets.portfolioDKK) : <span className="text-brand-warning">Missing Price</span>}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="sticky left-0 bg-brand-surface px-4 py-2 text-brand-text2">Housing</td>
                            {displayYears.map(y => (
                                <td key={y.yearIndex} className="px-4 py-2 text-right text-brand-text1 font-mono">
                                    {y.eoy.assets.housingDKK ? formatCurrency(y.eoy.assets.housingDKK) : <span className="text-brand-text3">-</span>}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-brand-accent/5 font-medium">
                            <td className="sticky left-0 bg-brand-surface px-4 py-2 text-brand-text1">Total Assets</td>
                            {displayYears.map(y => {
                                const total = (y.eoy.assets.cashDKK || 0) + (y.eoy.assets.portfolioDKK || 0) + (y.eoy.assets.housingDKK || 0);
                                return (
                                    <td key={y.yearIndex} className="px-4 py-2 text-right text-brand-text1 font-mono bg-brand-accent/5">
                                        {formatCurrency(total)}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* LIABILITIES */}
                        <tr className="bg-brand-surface2/30">
                            <td className="sticky left-0 bg-brand-surface2/30 px-4 py-2 font-semibold text-brand-text1" colSpan={displayYears.length + 1}>Liabilities</td>
                        </tr>
                        <tr>
                            <td className="sticky left-0 bg-brand-surface px-4 py-2 text-brand-text2">SU Debt</td>
                            {displayYears.map(y => (
                                <td key={y.yearIndex} className="px-4 py-2 text-right text-brand-text2 font-mono">
                                    {formatCurrency(y.eoy.liabilities.suDebtDKK || 0)}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="sticky left-0 bg-brand-surface px-4 py-2 text-brand-text2">Housing Loan</td>
                            {displayYears.map(y => (
                                <td key={y.yearIndex} className="px-4 py-2 text-right text-brand-text2 font-mono">
                                    {y.eoy.liabilities.housingLoanDKK ? formatCurrency(y.eoy.liabilities.housingLoanDKK) : <span className="text-brand-text3">-</span>}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="sticky left-0 bg-brand-surface px-4 py-2 text-brand-text2">Other Debt</td>
                            {displayYears.map(y => (
                                <td key={y.yearIndex} className="px-4 py-2 text-right text-brand-text2 font-mono">
                                    {y.eoy.liabilities.otherDebtDKK ? formatCurrency(y.eoy.liabilities.otherDebtDKK) : <span className="text-brand-text3">-</span>}
                                </td>
                            ))}
                        </tr>
                        <tr className="bg-brand-surface2/20 font-medium">
                            <td className="sticky left-0 bg-brand-surface px-4 py-2 text-brand-text1">Total Liabilities</td>
                            {displayYears.map(y => {
                                const total = (y.eoy.liabilities.suDebtDKK || 0) + (y.eoy.liabilities.housingLoanDKK || 0) + (y.eoy.liabilities.otherDebtDKK || 0);
                                return (
                                    <td key={y.yearIndex} className="px-4 py-2 text-right text-brand-text2 font-mono bg-brand-surface2/20">
                                        {formatCurrency(total)}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* NET WORTH */}
                        <tr className="bg-brand-accent/10 font-bold">
                            <td className="sticky left-0 bg-brand-surface text-brand-text1 border-t-2 border-brand-border px-4 py-3">Net Worth</td>
                            {displayYears.map(y => (
                                <td key={y.yearIndex} className="px-4 py-3 text-right text-brand-text1 font-mono border-t-2 border-brand-border bg-brand-accent/10 relative group">
                                    <div className="flex items-center justify-end gap-2">
                                        {formatCurrency(y.eoy.netWorthDKK || 0)}
                                        {y.yearIndex > 0 && (
                                            <button
                                                onClick={() => setSelectedYear(y)}
                                                title="View Reconciliation"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-brand-surface/50 rounded"
                                            >
                                                <Icon icon={HelpCircle} size={14} className="text-brand-text2" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            <ExplainDrawer year={selectedYear} open={!!selectedYear} onOpenChange={(v) => !v && setSelectedYear(null)} />
        </div>
    );
}
