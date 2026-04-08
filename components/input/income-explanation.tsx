"use client";

import { Drawer } from "@/components/ui/drawer";
import { Info, BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/cn";

interface IncomeExplanationProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function IncomeExplanation({ open, onOpenChange }: IncomeExplanationProps) {
    return (
        <Drawer
            open={open}
            onOpenChange={onOpenChange}
            title="Research Benchmarks: 10-Year Trajectory"
            description="How your salary and bonuses are projected based on market research in Danish Investment Banking."
        >
            <div className="space-y-10">
                {/* Trajectory visualization */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-brand-accent" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text1">Comparison: Base Salary</h4>
                    </div>

                    <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                            <BarChart3 className="w-32 h-32 text-brand-text1" />
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-brand-text3 tracking-wider">
                                <span>Start (Year 1)</span>
                                <span>Target (Year 10)</span>
                            </div>

                            {/* Moderate Track */}
                            <div className="space-y-2.5 group">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-semibold text-brand-text2 group-hover:text-brand-text1 transition-colors">Danske IB (Moderate)</span>
                                    <span className="text-sm font-bold text-brand-text1 tabular-nums">~150k / mo</span>
                                </div>
                                <div className="h-2.5 w-full bg-brand-surface2 rounded-full overflow-hidden border border-brand-border/50">
                                    <div className="h-full bg-brand-accent/40 rounded-full group-hover:bg-brand-accent/50 transition-all duration-500" style={{ width: '68%' }} />
                                </div>
                            </div>

                            {/* Aggressive Track */}
                            <div className="space-y-2.5 group">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-semibold text-brand-text2 group-hover:text-brand-text1 transition-colors">Danske IB (Aggressive)</span>
                                    <span className="text-sm font-bold text-brand-accent tabular-nums">~220k / mo</span>
                                </div>
                                <div className="h-2.5 w-full bg-brand-surface2 rounded-full overflow-hidden border border-brand-border/50">
                                    <div className="h-full bg-brand-accent rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]" style={{ width: '100%' }} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 p-4 bg-brand-accent/5 rounded-2xl border border-brand-accent/10 items-start relative z-10">
                            <Info className="w-4 h-4 text-brand-accent mt-0.5 shrink-0" />
                            <p className="text-xs text-brand-text2 leading-relaxed">
                                The aggressive track accounts for high-performers reaching <span className="font-bold text-brand-text1">Managing Director</span> level by year 9,
                                while the moderate track follows a standard <span className="font-bold text-brand-text1">Associate-to-Director</span> promotion cadence.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Breakdown Table */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-accent" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text1">Milestone Jumps</h4>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-brand-border bg-brand-surface shadow-sm">
                        <table className="w-full text-left text-[11px]">
                            <thead>
                                <tr className="bg-brand-surface2 border-b border-brand-border">
                                    <th className="px-5 py-4 font-bold text-brand-text1 uppercase tracking-wider text-[10px]">Phase</th>
                                    <th className="px-5 py-4 font-bold text-brand-text1 text-right uppercase tracking-wider text-[10px]">Base Salary</th>
                                    <th className="px-5 py-4 font-bold text-brand-text1 text-right uppercase tracking-wider text-[10px]">Bonus Target</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/50">
                                <tr className="group hover:bg-brand-surface2/30 transition-colors">
                                    <td className="px-5 py-4 text-brand-text2 font-bold group-hover:text-brand-text1">Analyst (Y1-2)</td>
                                    <td className="px-5 py-4 text-right text-brand-text1 tabular-nums font-medium">48.5k - 55k</td>
                                    <td className="px-5 py-4 text-right text-brand-text3 italic group-hover:text-brand-text2">~150k / yr</td>
                                </tr>
                                <tr className="group hover:bg-brand-surface2/30 transition-colors">
                                    <td className="px-5 py-4 text-brand-text2 font-bold group-hover:text-brand-text1">Associate (Y3-5)</td>
                                    <td className="px-5 py-4 text-right text-brand-text1 tabular-nums font-medium">70k - 90k</td>
                                    <td className="px-5 py-4 text-right text-brand-text3 italic group-hover:text-brand-text2">~300k / yr</td>
                                </tr>
                                <tr className="group hover:bg-brand-surface2/30 transition-colors">
                                    <td className="px-5 py-4 text-brand-text2 font-bold group-hover:text-brand-text1">VP (Y6-8)</td>
                                    <td className="px-5 py-4 text-right text-brand-text1 tabular-nums font-medium">100k - 140k</td>
                                    <td className="px-5 py-4 text-right text-brand-text3 italic group-hover:text-brand-text2">50% - 100%</td>
                                </tr>
                                <tr className="group hover:bg-brand-surface2/30 transition-colors">
                                    <td className="px-5 py-4 text-brand-text2 font-bold group-hover:text-brand-text1">Director+ (Y9+)</td>
                                    <td className="px-5 py-4 text-right text-brand-text1 tabular-nums font-medium">150k - 200k+</td>
                                    <td className="px-5 py-4 text-right text-brand-text3 italic group-hover:text-brand-text2">100% - 200%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Pivot Explanation */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-brand-accent" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text1">Private Equity Pivot</h4>
                    </div>
                    <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border space-y-4 relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 p-10 bg-brand-accent/5 rounded-full blur-2xl group-hover:bg-brand-accent/10 transition-all duration-700"></div>

                        <p className="text-xs text-brand-text2 leading-relaxed relative z-10">
                            Transitioning to PE after 3 years typically involves a step-up to a higher base salary (targeting <span className="font-bold text-brand-text1">~85,000 DKK</span>)
                            and a significantly higher annual bonus target (often <span className="font-bold text-brand-text1">400,000 DKK+</span>).
                        </p>
                        <div className="p-4 bg-brand-surface2/50 rounded-2xl border border-brand-border flex items-center justify-between relative z-10 backdrop-blur-sm">
                            <span className="text-[10px] font-bold text-brand-text3 uppercase tracking-wider">Avg. Year 4 Jump</span>
                            <span className="text-lg font-bold text-brand-accent">+28.5%</span>
                        </div>
                    </div>
                </section>
            </div>
        </Drawer>
    );
}
