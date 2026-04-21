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
    const headers = ["Post", ...monthNames, "År i alt", "Gns/Mdr"];

    const renderRow = (label: string, monthValues: number[], totalValue: number, isSubtotal = false, className?: string, isPercent = false) => {
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
                        {isPercent ? `${v.toFixed(1)}%` : formatDKK(v)}
                    </td>
                ))}
                <td className="px-3 py-2 text-right text-xs tabular-nums font-bold text-brand-text1 bg-brand-surface/20 min-w-[110px]">
                    {isPercent ? `${totalValue.toFixed(1)}%` : formatDKK(totalValue)}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-brand-text3 min-w-[100px]">
                    {isPercent ? `${avg.toFixed(1)}%` : formatDKK(avg)}
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
                        <tr className="bg-brand-surface border-b border-brand-border/80">
                            {headers.map((h, i) => (
                                <th key={i} className={cn(
                                    "px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text3 antialiased whitespace-nowrap",
                                    i === 0 && "sticky left-0 z-30 bg-brand-surface border-r border-brand-border/50 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.02)]",
                                    i > 0 && "text-right"
                                )}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                        {/* A) INDKOMST */}
                        {renderGroupHeader("Indkomst", "Indkomst i alt", months.map(m => m.income.total), yearly.income.total)}
                        {expanded.has("Indkomst") && (
                            <>
                                {renderRow("Indkomst i alt (brutto)", months.map(m => m.income.total), yearly.income.total, true)}
                                {renderRow("Nettoindkomst", months.map(m => m.income.total - m.tax.total), (yearly.income.total - yearly.tax.total), true, "text-brand-success bg-brand-success/5")}
                                {(() => {
                                    const monthRates = months.map(m => m.income.total > 0 ? (m.tax.total / m.income.total) * 100 : 0);
                                    const totalRate = yearly.income.total > 0 ? (yearly.tax.total / yearly.income.total) * 100 : 0;
                                    return renderRow("Effektiv skattesats (%)", monthRates, totalRate, true, "text-brand-text2 font-medium italic", true);
                                })()}
                                
                                <tr className="h-4 bg-brand-surface2" />

                                {renderRow("Løn (brutto)", months.map(m => m.income.salary), yearly.income.salary)}
                                {yearly.income.bonus > 0 && renderRow("Bonus", months.map(m => m.income.bonus), yearly.income.bonus)}
                                {months[0]?.income.custom?.map((cat: any, i: number) => {
                                    const monthVals = months.map(m => m.income.custom[i]?.amount || 0);
                                    const totalVal = monthVals.reduce((sum, v) => sum + v, 0);
                                    return totalVal > 0 ? renderRow(cat.category || "Ukendt indkomst", monthVals, totalVal) : null;
                                })}
                            </>
                        )}

                        {/* B) UDGIFTER */}
                        {renderGroupHeader("Faste & Variable udgifter", "Udgifter i alt", months.map(m => m.expenses.total - m.expenses.opsparing), yearly.expenses.total - yearly.expenses.opsparing)}
                        {expanded.has("Faste & Variable udgifter") && (
                            <>
                                {/* Base models deducted by custom items that share the group */}
                                {(() => {
                                    const customH = months[0]?.expenses.custom?.filter((c: any) => c.group === "Housing").reduce((sum: number, c: any) => sum + c.amount, 0) || 0;
                                    const baseHousing = months.map(m => m.expenses.housing - customH);
                                    const totalHousing = baseHousing.reduce((s, v) => s + v, 0);
                                    return totalHousing > 0 ? renderRow("Bolig drift", baseHousing, totalHousing) : null;
                                })()}
                                {(() => {
                                    const customU = months[0]?.expenses.custom?.filter((c: any) => c.group === "Utilities").reduce((sum: number, c: any) => sum + c.amount, 0) || 0;
                                    const baseUtil = months.map(m => m.expenses.utilities - customU);
                                    const totalUtil = baseUtil.reduce((s, v) => s + v, 0);
                                    return totalUtil > 0 ? renderRow("Forsyning", baseUtil, totalUtil) : null;
                                })()}
                                {(() => {
                                    const customI = months[0]?.expenses.custom?.filter((c: any) => c.group === "Insurance").reduce((sum: number, c: any) => sum + c.amount, 0) || 0;
                                    const baseIns = months.map(m => m.expenses.insurance - customI);
                                    const totalIns = baseIns.reduce((s, v) => s + v, 0);
                                    return totalIns > 0 ? renderRow("Forsikring", baseIns, totalIns) : null;
                                })()}

                                {/* Custom individual rows (excluding Opsparing) */}
                                {months[0]?.expenses.custom?.filter((cat: any) => cat.group !== "Opsparing").map((cat: any, i: number) => {
                                    const index = months[0].expenses.custom.indexOf(cat);
                                    const monthVals = months.map(m => m.expenses.custom[index]?.amount || 0);
                                    const totalVal = monthVals.reduce((sum, v) => sum + v, 0);
                                    return renderRow(cat.category || "Ukendt udgift", monthVals, totalVal);
                                })}

                                {renderRow("Variable udgifter i alt", months.map(m => m.expenses.total - m.expenses.opsparing), yearly.expenses.total - yearly.expenses.opsparing, true, "text-brand-text2 bg-brand-surface/40")}
                            </>
                        )}

                        {/* B.2) NY OPSPARING GRUPPE */}
                        {renderGroupHeader("Opsparingsposter", "Opsparing i alt", months.map(m => m.expenses.opsparing), yearly.expenses.opsparing)}
                        {expanded.has("Opsparingsposter") && (
                            <>
                                {months[0]?.expenses.custom?.filter((cat: any) => cat.group === "Opsparing").map((cat: any, i: number) => {
                                    const index = months[0].expenses.custom.indexOf(cat);
                                    const monthVals = months.map(m => m.expenses.custom[index]?.amount || 0);
                                    const totalVal = monthVals.reduce((sum, v) => sum + v, 0);
                                    return renderRow(cat.category || "Opsparing post", monthVals, totalVal, false, "text-brand-primary/80");
                                })}
                                {renderRow("Total Opsparing (Faste poster)", months.map(m => m.expenses.opsparing), yearly.expenses.opsparing, true, "bg-brand-primary/5 text-brand-primary")}
                            </>
                        )}

                        {/* SUB-TOTAL: Efter alle udgifter */}
                        <tr className="bg-brand-surface2/80 font-black border-y border-brand-border">
                            <td className="sticky left-0 z-20 bg-inherit px-4 py-3 text-xs uppercase tracking-widest text-brand-text1">
                                Total Cashflow Overskud
                            </td>
                            {months.map((m, i) => (
                                <td key={i} className="px-3 py-2 text-right text-xs tabular-nums text-brand-text1">
                                    {formatDKK(m.income.total - m.expenses.total - m.tax.total)}
                                </td>
                            ))}
                            <td className="px-3 py-2 text-right text-xs tabular-nums text-brand-text1 bg-brand-primary/5">
                                {formatDKK(yearly.income.total - yearly.expenses.total - yearly.tax.total)}
                            </td>
                            <td className="px-3 py-2 text-right text-xs tabular-nums text-brand-text2">
                                {formatDKK((yearly.income.total - yearly.expenses.total - yearly.tax.total) / 12)}
                            </td>
                        </tr>

                        {/* C) SKAT */}
                        {renderGroupHeader("Skat", "Skat i alt", months.map(m => m.tax.total), yearly.tax.total, months[0].tax.audit)}
                        {expanded.has("Skat") && (
                            <>
                                {renderRow("AM-bidrag", months.map(m => m.tax.amBidrag), yearly.tax.amBidrag)}
                                {renderRow("Kommuneskat", months.map(m => m.tax.kommune), yearly.tax.kommune)}
                                {renderRow("Kirkeskat", months.map(m => m.tax.church), yearly.tax.church)}
                                {renderRow("Bundskat", months.map(m => m.tax.bottom), yearly.tax.bottom)}
                                {renderRow("Mellemskat", months.map(m => m.tax.middle), yearly.tax.middle)}
                                {renderRow("Topskat", months.map(m => m.tax.top), yearly.tax.top)}
                                {renderRow("Aktieskat", months.map(m => m.tax.equity), yearly.tax.equity)}
                                {renderRow("ASK skat", months.map(m => m.tax.ask), yearly.tax.ask)}
                                {renderRow("Kapitalindkomstskat", months.map(m => m.tax.capital), yearly.tax.capital)}
                            </>
                        )}

                        {/* D) ALLOKERING */}
                        {renderGroupHeader("Fremtidig Allokering", "Resterende", months.map(m => m.allocations.residual), yearly.allocations.residual)}
                        {expanded.has("Fremtidig Allokering") && (
                            <>
                                {renderRow("Netto Rådighedsbeløb", months.map(m => m.netDisposable), yearly.netDisposable, true, "bg-brand-accent/5 text-brand-accent")}
                                {renderRow("Budgetteret Investering", months.map(m => m.allocations.invest), yearly.allocations.invest, false, "text-brand-primary")}
                                {renderRow("Likvid opsparing", months.map(m => m.allocations.liquidSavings), yearly.allocations.liquidSavings, false, "text-brand-success")}
                                {renderRow("Resterende likviditet (uallokeret)", months.map(m => m.allocations.residual), yearly.allocations.residual, true, "text-brand-text1 font-black")}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
