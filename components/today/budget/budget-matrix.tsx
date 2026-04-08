"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";

interface BudgetMatrixProps {
    data: {
        year: number;
        months: any[];
        yearly: any;
    };
}

export function BudgetMatrix({ data }: BudgetMatrixProps) {
    const { months, yearly } = data;
    const [expanded, setExpanded] = useState<Set<string>>(new Set(["Income", "Expenses", "Tax", "Net + Allocation"]));

    const toggleGroup = (group: string) => {
        const next = new Set(expanded);
        if (next.has(group)) next.delete(group);
        else next.add(group);
        setExpanded(next);
    };

    const monthNames = months.map(m => new Date(m.monthKey).toLocaleDateString("da-DK", { month: "short" }));
    const headers = ["Post", ...monthNames, "FY Total", "Avg/Mdr"];

    const renderRow = (label: string, monthValues: number[], totalValue: number, isSubtotal = false, className?: string) => {
        const avg = totalValue / 12;
        return (
            <tr className={cn(
                "group hover:bg-brand-surface/40 border-b border-brand-border/50",
                isSubtotal && "bg-brand-surface2 font-bold",
                className
            )}>
                <td className={cn(
                    "sticky left-0 z-20 px-4 py-2 text-xs font-medium text-brand-text1 border-r border-brand-border/50 min-w-[180px]",
                    isSubtotal ? "bg-brand-surface2" : "bg-brand-surface"
                )}>
                    {label}
                </td>
                {monthValues.map((v, i) => (
                    <td key={i} className="px-3 py-2 text-right text-xs tabular-nums text-brand-text2 min-w-[100px]">
                        {formatDKK(v)}
                    </td>
                ))}
                <td className="px-3 py-2 text-right text-xs tabular-nums font-bold text-brand-text1 bg-brand-surface/20 min-w-[110px]">
                    {formatDKK(totalValue)}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-brand-text3 min-w-[100px]">
                    {formatDKK(avg)}
                </td>
            </tr>
        );
    };

    const renderGroupHeader = (group: string, totalLabel: string, monthTotals: number[], grandTotal: number, audit?: ExplainAudit) => {
        const isOpen = expanded.has(group);
        return (
            <tr className="bg-brand-surface border-y border-brand-border font-bold">
                <td className="sticky left-0 z-20 bg-inherit px-4 py-3 text-xs uppercase tracking-wider text-brand-text1 flex items-center gap-2 cursor-pointer" onClick={() => toggleGroup(group)}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {group}
                </td>
                <td colSpan={headers.length - 1} className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2 text-xs text-brand-text2 tabular-nums">
                        <span className="font-normal opacity-70">{totalLabel}:</span>
                        <span className="text-brand-text1">{formatDKK(grandTotal)}</span>
                        {audit && <ExplainDrawer audit={audit} label="" />}
                    </div>
                </td>
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
                                    "px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-text3",
                                    i === 0 && "sticky left-0 z-30 bg-inherit border-r border-brand-border/50",
                                    i > 0 && "text-right"
                                )}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                        {/* A) INCOME */}
                        {renderGroupHeader("Income", "Total Income", months.map(m => m.income.total), yearly.income.total)}
                        {expanded.has("Income") && (
                            <>
                                {renderRow("Salary (gross)", months.map(m => m.income.salary), yearly.income.salary)}
                                {renderRow("Bonus", months.map(m => m.income.bonus), yearly.income.bonus)}
                                {renderRow("Other income", months.map(m => m.income.other), yearly.income.other)}
                                {renderRow("Total Income (gross)", months.map(m => m.income.total), yearly.income.total, true)}
                            </>
                        )}

                        {/* B) EXPENSES */}
                        {renderGroupHeader("Expenses", "Total Expenses", months.map(m => m.expenses.total), yearly.expenses.total)}
                        {expanded.has("Expenses") && (
                            <>
                                {renderRow("Rent / Housing", months.map(m => m.expenses.housing), yearly.expenses.housing)}
                                {renderRow("Utilities", months.map(m => m.expenses.utilities), yearly.expenses.utilities)}
                                {renderRow("Transport", months.map(m => m.expenses.transport), yearly.expenses.transport)}
                                {renderRow("Food", months.map(m => m.expenses.food), yearly.expenses.food)}
                                {renderRow("Subscriptions", months.map(m => m.expenses.subscriptions), yearly.expenses.subscriptions)}
                                {renderRow("Insurance", months.map(m => m.expenses.insurance), yearly.expenses.insurance)}
                                {renderRow("Other", months.map(m => m.expenses.other), yearly.expenses.other)}
                                {renderRow("Total Expenses", months.map(m => m.expenses.total), yearly.expenses.total, true, "text-brand-danger")}
                            </>
                        )}

                        {/* C) TAX */}
                        {renderGroupHeader("Tax", "Total Tax", months.map(m => m.tax.total), yearly.tax.total, months[0].tax.audit)}
                        {expanded.has("Tax") && (
                            <>
                                {renderRow("AM-bidrag", months.map(m => m.tax.amBidrag), yearly.tax.amBidrag)}
                                {renderRow("Kommuneskat", months.map(m => m.tax.kommune), yearly.tax.kommune)}
                                {renderRow("Kirkeskat", months.map(m => m.tax.church), yearly.tax.church)}
                                {renderRow("Bundskat", months.map(m => m.tax.bottom), yearly.tax.bottom)}
                                {renderRow("Mellemskat", months.map(m => m.tax.middle), yearly.tax.middle)}
                                {renderRow("Topskat", months.map(m => m.tax.top), yearly.tax.top)}
                                {renderRow("Equity tax", months.map(m => m.tax.equity), yearly.tax.equity)}
                                {renderRow("ASK tax", months.map(m => m.tax.ask), yearly.tax.ask)}
                                {renderRow("Capital income tax", months.map(m => m.tax.capital), yearly.tax.capital)}
                                {renderRow("Total Tax", months.map(m => m.tax.total), yearly.tax.total, true)}
                            </>
                        )}

                        {/* D) NET + ALLOCATION */}
                        {renderGroupHeader("Net + Allocation", "Surplus", months.map(m => m.allocations.residual), yearly.allocations.residual)}
                        {expanded.has("Net + Allocation") && (
                            <>
                                {renderRow("Net Disposable", months.map(m => m.netDisposable), yearly.netDisposable, true)}
                                {renderRow("Invest Contribution", months.map(m => m.allocations.invest), yearly.allocations.invest, false, "text-brand-primary")}
                                {renderRow("Liquid Savings", months.map(m => m.allocations.liquidSavings), yearly.allocations.liquidSavings, false, "text-brand-success")}
                                {renderRow("Residual Cash Flow", months.map(m => m.allocations.residual), yearly.allocations.residual, true, "text-brand-accent")}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
