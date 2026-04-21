import { useState, useMemo } from "react";
import { useProjectionModel } from "@/hooks/use-projection-model";
import { formatDKK } from "@/lib/format";
import { FormField } from "./shared";
import { motion } from "framer-motion";
import { Landmark, TrendingUp, Calendar, Coins, Settings2, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export function DebtTab() {
    const { inputs, updateInputs, loading } = useProjectionModel();

    // Defaults for the fallback state
    const defaultSuDebt = {
        currentBalance: 213519.73,
        interestRateStudy: 0.04,
        interestRateRepayment: 0.026,
        repaymentStartDate: "2028-01",
        useGracePeriod: true,
        futurePayouts: [
            { month: "2026-05", amount: 3799 },
            { month: "2026-06", amount: 3799 }
        ]
    };

    const suDebt = inputs?.suDebt || defaultSuDebt;

    const commitSuDebt = (partial: Partial<typeof defaultSuDebt>) => {
        updateInputs({ suDebt: { ...suDebt, ...partial } });
    };

    const addPayout = () => {
        const nextMonth = new Date().toISOString().substring(0, 7); // Default to this month
        commitSuDebt({
            futurePayouts: [...suDebt.futurePayouts, { month: nextMonth, amount: 3799 }]
        });
    };

    const removePayout = (idx: number) => {
        const copy = [...suDebt.futurePayouts];
        copy.splice(idx, 1);
        commitSuDebt({ futurePayouts: copy });
    };

    const updatePayout = (idx: number, field: 'month' | 'amount', value: any) => {
        const copy = [...suDebt.futurePayouts];
        copy[idx] = { ...copy[idx], [field]: value };
        commitSuDebt({ futurePayouts: copy });
    };

    // Calculate dynamic schedule locally for the table
    const schedule = useMemo(() => {
        const rows = [];
        const now = new Date();
        let currentYear = now.getFullYear();
        let currentMonth = now.getMonth() + 1; // 1-12
        let balance = suDebt.currentBalance;

        // Project 24 months for the view
        for (let i = 0; i < 24; i++) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            const displayDate = `15.${String(currentMonth).padStart(2, '0')}.${currentYear.toString().slice(2)}`;
            
            // Check if in repayment phase
            const isRepaymentPhase = dateStr >= suDebt.repaymentStartDate;
            const annualRate = isRepaymentPhase ? suDebt.interestRateRepayment : suDebt.interestRateStudy;
            const monthlyRate = annualRate / 12;

            // 1. Udbetaling first (usually earlier in month)
            const payoutsThisMonth = suDebt.futurePayouts.filter(p => p.month === dateStr);
            payoutsThisMonth.forEach((p, idx) => {
                balance += p.amount;
                rows.push({
                    id: `${dateStr}-payout-${idx}`,
                    date: `01.${String(currentMonth).padStart(2, '0')}.${currentYear.toString().slice(2)}`,
                    action: 'Udbetaling SU-lån',
                    opskrivning: p.amount,
                    nedskrivning: null,
                    balance: balance
                });
            });

            // 2. Interest Calc
            const interest = balance * monthlyRate;
            let repayment = 0;

            if (isRepaymentPhase && !suDebt.useGracePeriod) {
                // Fixed annuity or rule of thumb for this projection view (let's say 120 months)
                repayment = (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -120));
                
                // Repayment is every second month natively, but let's smooth it or just show monthly
            }

            if (suDebt.useGracePeriod || !isRepaymentPhase) {
                // Interest accumulate
                balance += interest;
                rows.push({
                    id: `${dateStr}-interest`,
                    date: displayDate,
                    action: 'Rentetilskrivning',
                    opskrivning: interest,
                    nedskrivning: null,
                    balance: balance
                });
            } else {
                // Paying down
                const principalRepayment = repayment - interest;
                balance -= principalRepayment;
                rows.push({
                    id: `${dateStr}-repayment`,
                    date: displayDate,
                    action: 'Afdrag & Rente',
                    opskrivning: interest,
                    nedskrivning: repayment,
                    balance: balance
                });
            }

            // Move to next month
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }
        return rows;
    }, [suDebt]);

    if (loading) return null;

    return (
        <div className="space-y-10 animate-fade-in-up">
            <motion.div
                whileHover={{ y: -2 }}
                className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-8 shadow-premium overflow-hidden relative group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center gap-3 mb-8 relative">
                    <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary shadow-sm">
                        <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-brand-text1 tracking-tight">SU-Lån Status</h3>
                        <p className="text-xs text-brand-text3">Nuværende hovedstol og afdragsindstillinger</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative text-brand-text3">
                    <FormField label="Restgæld pr. dags dato">
                        <div className="relative group/input">
                            <input
                                type="number"
                                value={suDebt.currentBalance}
                                onChange={e => commitSuDebt({ currentBalance: Number(e.target.value) })}
                                className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm pl-4 pr-12 py-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary/50 transition-all font-semibold text-brand-text2"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-40 group-focus-within/input:opacity-100 group-focus-within/input:text-brand-primary transition-all">
                                DKK
                            </div>
                        </div>
                    </FormField>

                    <FormField label="Første betalingsmåned">
                        <input
                            type="month"
                            value={suDebt.repaymentStartDate}
                            onChange={e => commitSuDebt({ repaymentStartDate: e.target.value })}
                            className="w-full rounded-xl border border-brand-border bg-brand-surface2/50 backdrop-blur-sm px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary/50 transition-all font-semibold text-brand-text2"
                        />
                    </FormField>

                    <FormField label="Afdragsfrihed">
                        <div className="flex gap-2 p-1 bg-brand-surface2/50 border border-brand-border rounded-xl mt-1 h-[46px]">
                            <button
                                onClick={() => commitSuDebt({ useGracePeriod: true })}
                                className={cn(
                                    "flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all",
                                    suDebt.useGracePeriod
                                        ? "bg-brand-primary text-brand-surface shadow-soft"
                                        : "text-brand-text3 hover:text-brand-text1 hover:bg-brand-surface"
                                )}
                            >
                                Aktiv
                            </button>
                            <button
                                onClick={() => commitSuDebt({ useGracePeriod: false })}
                                className={cn(
                                    "flex-1 px-4 py-2 text-xs font-bold rounded-lg transition-all",
                                    !suDebt.useGracePeriod
                                        ? "bg-brand-primary text-brand-surface shadow-soft"
                                        : "text-brand-text3 hover:text-brand-text1 hover:bg-brand-surface"
                                )}
                            >
                                Inaktiv
                            </button>
                        </div>
                    </FormField>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Udbetalinger */}
                <div className="lg:col-span-4">
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-6 shadow-premium overflow-hidden relative group h-full"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-accent/10 rounded-lg text-brand-accent">
                                    <Coins className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-brand-text1 text-sm tracking-tight">Fremtidige udbetalinger</h3>
                            </div>
                            <button 
                                onClick={addPayout}
                                className="p-2 hover:bg-brand-surface2 rounded-lg text-brand-text3 hover:text-brand-text1 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {suDebt.futurePayouts.length === 0 && (
                                <p className="text-xs text-brand-text3 italic text-center py-4">Ingen fremtidige udbetalinger planlagt.</p>
                            )}
                            {suDebt.futurePayouts.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-brand-surface2/30 p-3 rounded-xl border border-brand-border/50">
                                    <input
                                        type="month"
                                        value={p.month}
                                        onChange={e => updatePayout(idx, 'month', e.target.value)}
                                        className="bg-transparent text-sm text-brand-text2 font-medium outline-none w-32 border-b border-transparent focus:border-brand-primary/50"
                                    />
                                    <input
                                        type="number"
                                        value={p.amount}
                                        onChange={e => updatePayout(idx, 'amount', Number(e.target.value))}
                                        className="bg-transparent text-sm text-brand-text1 font-bold outline-none flex-1 text-right tabular-nums w-full"
                                    />
                                    <span className="text-xs text-brand-text3">kr.</span>
                                    <button 
                                        onClick={() => removePayout(idx)}
                                        className="text-brand-text3 hover:text-red-400 p-1 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Live Overview Table */}
                <div className="lg:col-span-8">
                    <motion.div
                        whileHover={{ y: -2 }}
                        className="bg-brand-surface/80 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-6 shadow-premium overflow-hidden relative group h-full"
                    >
                        <div className="flex items-center gap-3 mb-6 relative">
                            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-brand-text1 text-sm tracking-tight">Live Gældsudvikling (24 mdr)</h3>
                            <div className="ml-auto text-xs font-semibold text-brand-text3 flex items-center gap-2">
                                <span className="bg-brand-surface2 px-2 py-1 rounded-md">
                                    {(suDebt.interestRateStudy * 100).toFixed(1)}% Studie
                                </span>
                                <span className="bg-brand-surface2 px-2 py-1 rounded-md">
                                    {(suDebt.interestRateRepayment * 100).toFixed(1)}% Tilbagebetaling
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-brand-border/50 text-xs font-bold text-brand-text3 uppercase tracking-wider">
                                        <th className="pb-3 px-2">Dato</th>
                                        <th className="pb-3 px-2">Postering</th>
                                        <th className="pb-3 px-2 text-right">Opskrivning</th>
                                        <th className="pb-3 px-2 text-right">Nedskrivning</th>
                                        <th className="pb-3 px-2 text-right">Restgæld kr.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border/30">
                                    {schedule.map((row) => (
                                        <tr key={row.id} className="group hover:bg-brand-surface2/30 transition-colors">
                                            <td className="py-2.5 px-2 font-medium text-brand-text3 tabular-nums text-xs">
                                                {row.date}
                                            </td>
                                            <td className="py-2.5 px-2">
                                                <span className={cn(
                                                    "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase",
                                                    row.action === 'Rentetilskrivning' ? 'bg-brand-surface2 text-brand-text2' : 
                                                    row.action === 'Udbetaling SU-lån' ? 'bg-brand-accent/10 text-brand-accent' :
                                                    'bg-green-500/10 text-green-500' // Afdrag
                                                )}>
                                                    {row.action}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-2 text-right tabular-nums text-brand-text2 font-medium">
                                                {row.opskrivning ? formatDKK(row.opskrivning) : ''}
                                            </td>
                                            <td className="py-2.5 px-2 text-right tabular-nums text-brand-text2 font-medium">
                                                {row.nedskrivning ? formatDKK(row.nedskrivning) : ''}
                                            </td>
                                            <td className="py-2.5 px-2 text-right tabular-nums font-bold text-brand-text1">
                                                {formatDKK(row.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
