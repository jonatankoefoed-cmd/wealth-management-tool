"use client";

import { useState } from "react";
import {
    ChevronDown,
    ChevronRight,
    Calculator,
    PiggyBank,
    TrendingUp,
    ShieldCheck,
    ArrowDownRight
} from "lucide-react";
import {
    Table,
    TableShell,
    TableWrap,
    THead,
    TR,
    TH,
    TD
} from "@/components/ui/table";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";

interface CategoryAmount {
    category: string;
    amount: number;
}

interface MonthBudget {
    monthKey: string;
    income: { gross: number; pension: number | null; other: number | null };
    expenses: { total: number; byCategory: CategoryAmount[] };
    tax: { total: number; breakdown: any[]; audit: ExplainAudit };
    netDisposable: number;
    allocations: { invest: number; liquidSavings: number; residual: number };
}

export function BudgetTable({ months }: { months: MonthBudget[] }) {
    const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

    const toggleMonth = (key: string) => {
        const next = new Set(expandedMonths);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setExpandedMonths(next);
    };

    return (
        <TableShell>
            <TableWrap>
                <Table>
                    <THead>
                        <TR>
                            <TH className="w-8"></TH>
                            <TH>Måned</TH>
                            <TH className="text-right">Brutto Indkomst</TH>
                            <TH className="text-right">Skat</TH>
                            <TH className="text-right">Udgifter</TH>
                            <TH className="text-right">Til Disp.</TH>
                            <TH className="text-right">Investering</TH>
                            <TH className="text-right">Opsparing</TH>
                            <TH className="text-right">Rest</TH>
                        </TR>
                    </THead>
                    <tbody>
                        {months.map((m) => {
                            const isExpanded = expandedMonths.has(m.monthKey);
                            const monthName = new Date(m.monthKey).toLocaleDateString("da-DK", { month: "long" });

                            return (
                                <>
                                    <TR key={m.monthKey} className="group hover:bg-brand-surface/50">
                                        <TD onClick={() => toggleMonth(m.monthKey)} className="cursor-pointer">
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </TD>
                                        <TD className="font-semibold text-brand-text1 capitalize">{monthName}</TD>
                                        <TD className="text-right tabular-nums">{formatDKK(m.income.gross)}</TD>
                                        <TD className="text-right tabular-nums">
                                            <div className="flex items-center justify-end gap-1">
                                                <span>{formatDKK(m.tax.total)}</span>
                                                <ExplainDrawer audit={m.tax.audit} label="" />
                                            </div>
                                        </TD>
                                        <TD className="text-right tabular-nums text-brand-danger">{formatDKK(m.expenses.total)}</TD>
                                        <TD className="text-right tabular-nums font-bold text-brand-text1">{formatDKK(m.netDisposable)}</TD>
                                        <TD className="text-right tabular-nums text-brand-primary">{formatDKK(m.allocations.invest)}</TD>
                                        <TD className="text-right tabular-nums text-brand-success">{formatDKK(m.allocations.liquidSavings)}</TD>
                                        <TD className="text-right tabular-nums text-brand-text3">{formatDKK(m.allocations.residual)}</TD>
                                    </TR>
                                    {isExpanded && (
                                        <TR className="bg-brand-surface/30">
                                            <TD colSpan={9} className="p-0">
                                                <div className="grid grid-cols-2 gap-8 p-4 bg-brand-surface/20 border-y border-brand-border/30">
                                                    <div>
                                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-text3 mb-2 flex items-center gap-1">
                                                            <ArrowDownRight size={12} /> Udgiftsfordeling
                                                        </h4>
                                                        <div className="space-y-1">
                                                            {m.expenses.byCategory.map((cat) => (
                                                                <div key={cat.category} className="flex justify-between text-xs">
                                                                    <span className="text-brand-text2">{cat.category}</span>
                                                                    <span className="text-brand-text1 tabular-nums font-medium">{formatDKK(cat.amount)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-text3 mb-2 flex items-center gap-1">
                                                            <Calculator size={12} /> Skatteinfo
                                                        </h4>
                                                        <p className="text-xs text-brand-text3 leading-relaxed">
                                                            Beregnet som årskørsel for {new Date(m.monthKey).getFullYear()} baseret på din nuværende løn.
                                                            Tryk på info-ikonet i tabellen for at se den fulde audit-trail fra skattemotoren.
                                                        </p>
                                                    </div>
                                                </div>
                                            </TD>
                                        </TR>
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </Table>
            </TableWrap>
        </TableShell>
    );
}
