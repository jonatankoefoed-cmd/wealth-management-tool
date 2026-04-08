"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ExplainDrawer } from "@/components/shared/explain-drawer";

interface YearlyMatrixProps {
    data: {
        startYear: number;
        horizonYears: number;
        years: {
            yearIndex: number;
            calendarYear: number;
            pnl: {
                income: {
                    total: number;
                    lines: { key: string; label: string; amount: number }[];
                };
                expenses: {
                    total: number;
                    lines: { key: string; label: string; amount: number }[];
                };
                tax: {
                    total: number;
                    breakdown: { key: string; label: string; amount: number }[];
                    audit?: any;
                };
                netDisposable: number;
                allocations: { invest: number; liquidSavings: number; residual: number };
            };
            reconciliation: {
                derivedFromMonthly: true;
                incomeSumOfMonths: number;
                deltaChecks: { income: number };
            };
            notes: string[];
        }[];
        meta?: {
            lastUpdated: string;
        };
    };
}

export function YearlyMatrix({ data }: YearlyMatrixProps) {
    const { years } = data;
    const [expanded, setExpanded] = useState<Set<string>>(new Set(["Income", "Expenses", "Tax", "Net + Allocation"]));

    const toggleGroup = (group: string) => {
        const next = new Set(expanded);
        if (next.has(group)) next.delete(group);
        else next.add(group);
        setExpanded(next);
    };

    const headers = ["Post", ...years.map(y => `Year ${y.yearIndex} (${y.calendarYear})`)];

    // Helper to render a group header row
    const renderGroupHeader = (group: string, values: number[], audit?: any, recon?: { derived: boolean, delta: number }, editLink?: string) => {
        const isOpen = expanded.has(group);
        const isReconciled = recon ? Math.abs(recon.delta) < 0.1 : true;

        return (
            <tr className="bg-brand-surface border-y border-brand-border font-bold">
                <td
                    className="sticky left-0 z-20 bg-brand-surface px-4 py-3 text-xs uppercase tracking-wider text-brand-text1 flex items-center gap-2 cursor-pointer select-none hover:text-brand-primary transition-colors min-w-[200px]"
                    onClick={() => toggleGroup(group)}
                >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {group}

                    {/* Audit / Reconciliation Icons */}
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 ml-2">
                        {audit && <ExplainDrawer audit={audit} label="" />}
                        {recon && (
                            <div className="group/recon relative">
                                {isReconciled ? (
                                    <CheckCircle2 size={14} className="text-brand-success opacity-70" />
                                ) : (
                                    <AlertTriangle size={14} className="text-brand-danger" />
                                )}
                            </div>
                        )}
                    </div>
                </td>
                {values.map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right text-xs tabular-nums font-bold text-brand-text1 min-w-[120px] relative group">
                        {formatDKK(v)}
                        {/* Edit Link on Hover for first col or header? Better in the sticky col */}
                    </td>
                ))}
            </tr>
        );
    };

    const renderRow = (label: string, values: number[], className?: string) => {
        return (
            <tr className={cn(
                "group hover:bg-brand-surface/40 border-b border-brand-border/50 transition-colors",
                className
            )}>
                <td className="sticky left-0 z-20 bg-brand-surface px-4 py-2 text-xs font-medium text-brand-text1 border-r border-brand-border/50 min-w-[200px] pl-8">
                    {label}
                </td>
                {values.map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right text-xs tabular-nums text-brand-text2 min-w-[120px]">
                        {formatDKK(v)}
                    </td>
                ))}
            </tr>
        );
    };

    // Helper to extract line values across years by key
    const getLineValues = (pnlKey: 'income' | 'expenses', lineKey: string) => {
        return years.map(y => y.pnl[pnlKey].lines.find(l => l.key === lineKey)?.amount || 0);
    };

    const getTaxLineValues = (lineKey: string) => {
        return years.map(y => y.pnl.tax.breakdown.find(l => l.key === lineKey)?.amount || 0);
    };

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-brand-border/40 bg-brand-surface/40 backdrop-blur-md shadow-xl transition-all duration-300 hover:border-brand-border/60">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-brand-surface border-b border-brand-border">
                            {headers.map((h, i) => (
                                <th key={i} className={cn(
                                    "px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-text3 whitespace-nowrap",
                                    i === 0 && "sticky left-0 z-30 bg-brand-surface border-r border-brand-border/50",
                                    i > 0 && "text-right"
                                )}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                        {/* INCOME */}
                        {renderGroupHeader(
                            "Income",
                            years.map(y => y.pnl.income.total),
                            undefined,
                            { derived: true, delta: years[0]?.reconciliation?.deltaChecks?.income || 0 },
                            "/input?tab=income"
                        )}
                        {expanded.has("Income") && (
                            <>
                                {renderRow("Salary", getLineValues('income', 'salary'))}
                                {renderRow("Bonus / Other", years.map(y => (getLineValues('income', 'bonus')[y.yearIndex - 1] || 0) + (getLineValues('income', 'other')[y.yearIndex - 1] || 0)))}
                            </>
                        )}

                        {/* EXPENSES */}
                        {renderGroupHeader(
                            "Expenses",
                            years.map(y => y.pnl.expenses.total),
                            undefined,
                            undefined, // Expenses recon not explicit in simplified yearly model yet, but logic is sound
                            "/input?tab=budget"
                        )}
                        {expanded.has("Expenses") && (
                            <>
                                {renderRow("Housing", getLineValues('expenses', 'housing'))}
                                {renderRow("Utilities", getLineValues('expenses', 'utilities'))}
                                {renderRow("Transport", getLineValues('expenses', 'transport'))}
                                {renderRow("Food", getLineValues('expenses', 'food'))}
                                {renderRow("Subscriptions", getLineValues('expenses', 'subscriptions'))}
                                {renderRow("Insurance", getLineValues('expenses', 'insurance'))}
                                {renderRow("Other", getLineValues('expenses', 'other'))}
                            </>
                        )}

                        {/* TAX */}
                        {/* Using Year 1 tax audit as ref for structure, though typically each year has its own. 
                            We pass the first year's audit for the drawer icon on the header for now. 
                        */}
                        {renderGroupHeader("Tax", years.map(y => y.pnl.tax.total), years[0]?.pnl.tax.audit)}
                        {expanded.has("Tax") && (
                            <>
                                {renderRow("AM-bidrag", getTaxLineValues('amBidrag'))}
                                {renderRow("Kommuneskat", getTaxLineValues('kommune'))}
                                {renderRow("Kirkeskat", getTaxLineValues('church'))}
                                {renderRow("Bundskat", getTaxLineValues('bottom'))}
                                {renderRow("Mellemskat", getTaxLineValues('middle'))}
                                {renderRow("Topskat", getTaxLineValues('top'))}
                                {renderRow("Equity Tax", getTaxLineValues('equity'))}
                            </>
                        )}

                        {/* NET + ALLOCATION */}
                        {renderGroupHeader(
                            "Net + Allocation",
                            years.map(y => y.pnl.allocations.residual),
                            undefined,
                            undefined,
                            "/input?tab=allocation"
                        )}
                        {expanded.has("Net + Allocation") && (
                            <>
                                {renderRow("Net Disposable", years.map(y => y.pnl.netDisposable), "font-bold text-brand-text1 bg-brand-surface/20")}
                                {renderRow("Liquid Savings", years.map(y => y.pnl.allocations.liquidSavings), "text-brand-success")}
                                {renderRow("Investable Surplus", years.map(y => y.pnl.allocations.residual), "text-brand-primary")}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
