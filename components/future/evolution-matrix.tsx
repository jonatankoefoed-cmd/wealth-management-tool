"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ExplainDrawer } from "@/components/shared/explain-drawer";

interface EvolutionMatrixProps {
    data: {
        startYear: number;
        horizonYears: number;
        years: {
            yearIndex: number;
            calendarYear: number;
            typicalMonth: {
                income: { salary: number; bonus: number; other: number; total: number };
                expenses: { total: number; housing: number; utilities: number; transport: number; food: number; subscriptions: number; insurance: number; other: number };
                tax: { total: number; amBidrag: number; kommune: number; church: number; bottom: number; middle: number; top: number; equity: number; ask: number; capital: number; audit?: any };
                netDisposable: number;
                allocations: { invest: number; liquidSavings: number; residual: number };
            };
            notes: string[];
        }[];
    };
}

export function EvolutionMatrix({ data }: EvolutionMatrixProps) {
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
    const renderGroupHeader = (group: string, values: number[], audit?: any, editLink?: string) => {
        const isOpen = expanded.has(group);
        return (
            <tr className="bg-brand-surface border-y border-brand-border font-bold">
                <td
                    className="sticky left-0 z-20 bg-brand-surface px-4 py-3 text-xs uppercase tracking-wider text-brand-text1 flex items-center gap-2 cursor-pointer select-none hover:text-brand-primary transition-colors min-w-[180px]"
                    onClick={() => toggleGroup(group)}
                >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {group}
                    {/* Only show audit icon if provided (e.g. for Tax) */}
                    {audit && (
                        <div onClick={(e) => e.stopPropagation()} className="ml-2">
                            <ExplainDrawer audit={audit} label="" />
                        </div>
                    )}

                    {/* Deep Link to Inputs */}
                    {editLink && (
                        <a
                            href={editLink}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto mr-2 text-[10px] text-brand-primary opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
                        >
                            Edit
                        </a>
                    )}
                </td>
                {values.map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right text-xs tabular-nums font-bold text-brand-text1 min-w-[120px] relative group">
                        {formatDKK(v)}
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
                <td className="sticky left-0 z-20 bg-brand-surface px-4 py-2 text-xs font-medium text-brand-text1 border-r border-brand-border/50 min-w-[180px]">
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

    return (
        <div className="w-full overflow-hidden rounded-lg border border-brand-border bg-brand-surface2 shadow-soft">
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
                        {renderGroupHeader("Income", years.map(y => y.typicalMonth.income.total), undefined, "/input?tab=income")}
                        {expanded.has("Income") && (
                            <>
                                {renderRow("Salary (gross)", years.map(y => y.typicalMonth.income.salary))}
                                {renderRow("Bonus / Other", years.map(y => y.typicalMonth.income.bonus + y.typicalMonth.income.other))}
                            </>
                        )}

                        {/* EXPENSES */}
                        {renderGroupHeader("Expenses", years.map(y => y.typicalMonth.expenses.total), undefined, "/input?tab=budget")}
                        {expanded.has("Expenses") && (
                            <>
                                {renderRow("Housing", years.map(y => y.typicalMonth.expenses.housing))}
                                {renderRow("Utilities", years.map(y => y.typicalMonth.expenses.utilities))}
                                {renderRow("Transport", years.map(y => y.typicalMonth.expenses.transport))}
                                {renderRow("Food", years.map(y => y.typicalMonth.expenses.food))}
                                {renderRow("Subscriptions", years.map(y => y.typicalMonth.expenses.subscriptions))}
                                {renderRow("Insurance", years.map(y => y.typicalMonth.expenses.insurance))}
                                {renderRow("Other", years.map(y => y.typicalMonth.expenses.other))}
                            </>
                        )}

                        {/* TAX */}
                        {/* Use Year 1 audit as representative sample */}
                        {renderGroupHeader("Tax", years.map(y => y.typicalMonth.tax.total), years[0]?.typicalMonth.tax.audit)}
                        {expanded.has("Tax") && (
                            <>
                                {renderRow("AM-bidrag", years.map(y => y.typicalMonth.tax.amBidrag))}
                                {renderRow("Kommuneskat", years.map(y => y.typicalMonth.tax.kommune))}
                                {renderRow("Kirkeskat", years.map(y => y.typicalMonth.tax.church))}
                                {renderRow("State Tax (Bund/Top)", years.map(y => y.typicalMonth.tax.bottom + y.typicalMonth.tax.middle + y.typicalMonth.tax.top))}
                                {renderRow("Capital/Equity Tax", years.map(y => y.typicalMonth.tax.equity + y.typicalMonth.tax.ask + y.typicalMonth.tax.capital))}
                            </>
                        )}

                        {/* NET + ALLOCATION */}
                        {renderGroupHeader("Net + Allocation", years.map(y => y.typicalMonth.allocations.residual), undefined, "/input?tab=allocation")}
                        {expanded.has("Net + Allocation") && (
                            <>
                                {renderRow("Net Disposable", years.map(y => y.typicalMonth.netDisposable), "font-bold text-brand-text1 bg-brand-surface/20")}
                                {renderRow("Liquid Savings", years.map(y => y.typicalMonth.allocations.liquidSavings), "text-brand-success")}
                                {renderRow("Investable Surplus", years.map(y => y.typicalMonth.allocations.residual), "text-brand-primary")}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
