import { useProjectionModel } from "@/hooks/use-projection-model";
import { FormField } from "./shared";
import { SlidersHorizontal, TrendingUp, DollarSign, Wallet, Briefcase, HelpCircle, ArrowUpRight, Target, Flame, Scale } from "lucide-react";
import { useState, useMemo } from "react";
import { IncomeExplanation } from "./income-explanation";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";

export function IncomePathTab() {
    const { inputs, updateInputs, applyCareerPreset, loading } = useProjectionModel();
    const [explanationOpen, setExplanationOpen] = useState(false);

    const baseline = (inputs?.baseline as any) || {
        monthlyGrossIncome: 48500,
        pensionContributionRate: 0.17,
        monthlyDisposableIncomeBeforeHousing: 35000,
        monthlyNonHousingExpenses: 20000,
        annualBonus: 0
    };
    const growth = inputs?.salary_growth_path || { model: 'standard', yearlyPct: Array(10).fill(2) };
    const bonusPath = inputs?.bonus_growth_path || { model: 'standard', yearlyPct: Array(10).fill(0.20) };

    const monthlyGrossIncome = baseline.monthlyGrossIncome ?? 48500;
    const pensionContributionRate = baseline.pensionContributionRate ?? 0.17;
    const annualBonus = baseline.annualBonus ?? 0;

    // Calculate detailed year-by-year projections
    const projections = useMemo(() => {
        let currentMonthlySalary = monthlyGrossIncome;

        return growth.yearlyPct?.map((pct: number, index: number) => {
            const r = pct > 1 ? pct / 100 : pct;

            // Apply growth to salary
            currentMonthlySalary = currentMonthlySalary * (1 + r);

            // Get bonus pct for this year
            const bonusPct = bonusPath.yearlyPct?.[index] ?? (annualBonus / (monthlyGrossIncome * 12) || 0);

            // Calculate annual bonus
            const currentAnnualBonus = (currentMonthlySalary * 12) * bonusPct;

            return {
                year: index + 1,
                growthRate: pct,
                monthlySalary: currentMonthlySalary,
                annualBonus: currentAnnualBonus,
                bonusPercentage: bonusPct
            };
        }) || [];
    }, [monthlyGrossIncome, annualBonus, growth.yearlyPct, bonusPath.yearlyPct]);

    // Calculate Y10 Projection for display (from last year of projections)
    const y10Salary = projections.length > 0 ? projections[projections.length - 1].monthlySalary : monthlyGrossIncome;

    if (loading || !inputs) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading income data...</div>;
    }

    const currentTrack = inputs.careerTrack || 'manual';
    const showPivot = currentTrack.startsWith('danske_ib');

    const setBaseline = (key: string, val: any) => {
        updateInputs({ baseline: { ...baseline, [key]: val } });
    };

    const setGrowth = (idx: number, val: number) => {
        const newPct = [...(growth.yearlyPct || [])];
        newPct[idx] = val;
        updateInputs({ salary_growth_path: { ...growth, yearlyPct: newPct } });
    };

    const setBonusPath = (idx: number, val: number) => {
        const newPct = [...(bonusPath.yearlyPct || [])];
        newPct[idx] = val;
        updateInputs({ bonus_growth_path: { ...bonusPath, yearlyPct: newPct } });
    };

    return (
        <div className="space-y-12 max-w-4xl animate-fade-in-up pb-10">
            <IncomeExplanation open={explanationOpen} onOpenChange={setExplanationOpen} />

            {/* Header with Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-1 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet className="w-12 h-12 text-brand-text1" />
                    </div>
                    <p className="text-[10px] font-bold text-brand-text3 uppercase tracking-wider relative z-10">Starting Salary</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <span className="text-2xl font-bold text-brand-text1 tracking-tight">{formatDKK(monthlyGrossIncome)}</span>
                        <span className="text-xs font-medium text-brand-text3">/ mo</span>
                    </div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-1 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-12 h-12 text-brand-accent" />
                    </div>
                    <p className="text-[10px] font-bold text-brand-text3 uppercase tracking-wider relative z-10">Projected Year 10</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <span className="text-2xl font-bold text-brand-accent tracking-tight">{formatDKK(y10Salary)}</span>
                        <span className="text-xs font-medium text-brand-text3">/ mo</span>
                    </div>
                </div>
                <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 space-y-1 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-12 h-12 text-brand-secondary" />
                    </div>
                    <p className="text-[10px] font-bold text-brand-text3 uppercase tracking-wider relative z-10">Annual Bonus Target</p>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <span className="text-2xl font-bold text-brand-secondary tracking-tight">{formatDKK(annualBonus)}</span>
                        <span className="text-xs font-medium text-brand-text3">/ yr</span>
                    </div>
                </div>
            </div>

            {/* Career Track Selection */}
            <section className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-brand-border/50">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-brand-accent/10 rounded-lg text-brand-accent">
                            <Briefcase className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-text1">
                            Career Pathway
                        </h3>
                    </div>
                    <button
                        onClick={() => setExplanationOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-brand-accent bg-brand-accent/5 hover:bg-brand-accent/10 border border-brand-accent/20 rounded-full transition-all group"
                    >
                        <HelpCircle className="w-3 h-3 group-hover:animate-pulse" />
                        Explore Research Data
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField label="Select Path Benchmark">
                        <div className="grid grid-cols-2 gap-2 p-1 bg-brand-surface2 border border-brand-border rounded-xl">
                            {[
                                { id: 'manual', label: 'Manual', icon: SlidersHorizontal },
                                { id: 'danske_ib_moderate', label: 'IB Moderate', icon: Scale },
                                { id: 'danske_ib_aggressive', label: 'IB Aggressive', icon: Flame },
                                { id: 'danish_pe', label: 'Danish PE', icon: Target }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => applyCareerPreset?.(t.id, inputs.careerPivot)}
                                    className={`flex items-center gap-2 px-3 py-2 text-[10px] font-bold rounded-lg transition-all ${currentTrack === t.id
                                        ? "bg-brand-accent text-brand-textInvert shadow-soft"
                                        : "text-brand-text2 hover:text-brand-text1 hover:bg-brand-surface"
                                        }`}
                                >
                                    <t.icon className="w-3.5 h-3.5" />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-brand-text3 mt-2 leading-relaxed">
                            Career presets adjust starting salary, promotion jumps, and bonus targets based on industry benchmarks.
                        </p>
                    </FormField>

                    {showPivot && (
                        <FormField label="Strategic Pivot: Year 3">
                            <div
                                onClick={() => applyCareerPreset?.(currentTrack, !inputs.careerPivot)}
                                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${inputs.careerPivot
                                    ? "bg-brand-accent/5 border-brand-accent/40 shadow-inner"
                                    : "bg-brand-surface2 border-brand-border hover:border-brand-accent/20"
                                    }`}
                            >
                                <div className="flex gap-3 items-center">
                                    <div className={`p-2.5 rounded-xl transition-colors ${inputs.careerPivot ? "bg-brand-accent text-brand-textInvert" : "bg-brand-surface text-brand-text3"}`}>
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-brand-text1">Switch to Private Equity</p>
                                        <p className="text-[10px] text-brand-text3">Exit to PE Associate baseline (~85k/mo)</p>
                                    </div>
                                </div>
                                <div className={`w-10 h-6 rounded-full relative transition-colors ${inputs.careerPivot ? "bg-brand-accent" : "bg-brand-border"}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${inputs.careerPivot ? "left-5" : "left-1"}`} />
                                </div>
                            </div>
                        </FormField>
                    )}
                </div>
            </section>

            {/* Income Configuration */}
            <section className="space-y-8 bg-brand-surface border border-brand-border rounded-3xl p-8">
                <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-brand-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-brand-text1">Baseline Configuration</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <FormField label="Monthly Base Salary (Gross)">
                            <div className="relative group">
                                <input
                                    type="number"
                                    value={monthlyGrossIncome}
                                    onChange={e => setBaseline('monthlyGrossIncome', Number(e.target.value))}
                                    className="w-full rounded-xl border border-brand-border bg-brand-surface2 px-4 py-3 text-sm font-bold tabular-nums focus:ring-2 focus:ring-brand-accent/30 outline-none transition-all pr-12"
                                />
                                <span className="absolute right-4 top-3.5 text-xs font-bold text-brand-text3 uppercase">DKK</span>
                            </div>
                        </FormField>

                        <FormField label="Expected Annual Bonus">
                            <div className="relative group">
                                <DollarSign className="w-4 h-4 text-brand-text3 absolute left-4 top-3.5" />
                                <input
                                    type="number"
                                    value={annualBonus}
                                    onChange={e => setBaseline('annualBonus', Number(e.target.value))}
                                    className="w-full rounded-xl border border-brand-border bg-brand-surface2 pl-10 pr-12 py-3 text-sm font-bold tabular-nums focus:ring-2 focus:ring-brand-accent/30 outline-none transition-all"
                                />
                                <span className="absolute right-4 top-3.5 text-xs font-bold text-brand-text3 uppercase">DKK</span>
                            </div>
                        </FormField>
                    </div>

                    <div className="bg-brand-surface2/50 border border-brand-border rounded-2xl p-6 space-y-6">
                        <FormField label="Pension Contribution">
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="25"
                                    step="0.5"
                                    value={pensionContributionRate * 100}
                                    onChange={e => setBaseline('pensionContributionRate', Number(e.target.value) / 100)}
                                    className="flex-1 accent-brand-accent h-1.5 bg-brand-border rounded-full appearance-none cursor-pointer"
                                />
                                <div className="bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 min-w-[4rem] text-center">
                                    <span className="text-xs font-bold tabular-nums text-brand-text1">{(pensionContributionRate * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-brand-text3 mt-2">Combined Employer + Employee portion.</p>
                        </FormField>

                        <div className="p-3 bg-brand-accent/5 rounded-xl border border-brand-accent/10 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-brand-text3 uppercase">Eff. Monthly Net Estimate</span>
                            <span className="text-sm font-bold text-brand-text1">~{formatDKK(monthlyGrossIncome * 0.55)}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Growth & Development */}
            <section className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-brand-border/50">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-accent" />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-text1">
                            10-Year Growth Projection
                        </h3>
                    </div>
                    {/* Visual Growth Sparkline can stay as visual sugar, but maybe simplify or keep as is */}
                    <div className="hidden sm:flex gap-1.5 items-end h-8 px-4 bg-brand-surface2/30 rounded-full py-1 border border-brand-border/20">
                        {growth.yearlyPct?.map((p: number, i: number) => {
                            const rate = p > 1 ? p : p * 100;
                            const height = Math.min(100, Math.max(15, rate * 2));
                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-2.5 rounded-t-[2px] transition-all duration-500",
                                        rate > 10 ? "bg-brand-accent" : "bg-brand-accent/30"
                                    )}
                                    style={{ height: `${height}%` }}
                                    title={`Year ${i + 1}: ${rate.toFixed(1)}%`}
                                />
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {projections.map((proj: any, i: number) => {
                        const val = growth.yearlyPct?.[i] ?? 2;
                        const displayVal = val > 1 ? val : (val * 100);
                        const isPromote = displayVal > 20;

                        return (
                            <div key={i} className="group relative flex flex-col justify-between p-4 rounded-2xl border border-brand-border bg-brand-surface hover:border-brand-accent/40 hover:bg-brand-surface2/30 hover:shadow-lg hover:shadow-brand-accent/5 transition-all duration-300">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] uppercase font-bold text-brand-text3 tracking-wider">Year {i + 1}</span>
                                        {isPromote && <span className="px-1.5 py-0.5 bg-brand-accent text-brand-textInvert text-[9px] font-bold rounded shadow-float uppercase">Promote</span>}
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] text-brand-text3">Base Salary</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-brand-text1 tabular-nums tracking-tight">{formatDKK(proj.monthlySalary)}</span>
                                            <span className="text-[10px] text-brand-text3">/mo</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1 pt-2 border-t border-dashed border-brand-border/50">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-brand-text3">Bonus Target</p>
                                            <div className="flex items-center gap-1 bg-brand-surface2 rounded-lg px-2 py-0.5 group-hover:bg-brand-surface transition-colors">
                                                <input
                                                    type="number"
                                                    value={((proj.bonusPercentage ?? 0) * 100).toFixed(0)}
                                                    onChange={e => setBonusPath(i, Number(e.target.value) / 100)}
                                                    className="w-9 bg-transparent border-none p-0 text-[10px] font-bold focus:ring-0 tabular-nums outline-none text-brand-secondary text-right"
                                                />
                                                <span className="text-[10px] font-bold text-brand-secondary">%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-bold text-brand-secondary tabular-nums tracking-tight">{formatDKK(proj.annualBonus)}</span>
                                            <span className="text-[9px] text-brand-text3">/yr</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between">
                                    <span className="text-[10px] font-medium text-brand-text2">Growth</span>
                                    <div className="flex items-center gap-1 bg-brand-surface2 rounded-lg px-2 py-1 group-hover:bg-brand-surface transition-colors">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={displayVal.toFixed(1)}
                                            onChange={e => setGrowth(i, Number(e.target.value))}
                                            className="w-10 bg-transparent border-none p-0 text-xs font-bold focus:ring-0 tabular-nums outline-none text-brand-text1 text-right"
                                        />
                                        <span className="text-[10px] font-bold text-brand-accent">%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {growth.model === 'career_preset' && (
                    <p className="text-[10px] text-brand-accent font-bold uppercase tracking-tight text-right flex items-center justify-end gap-2">
                        <Scale className="w-3 h-3" />
                        Promotion-adjusted growth path applied
                    </p>
                )}
            </section>

        </div>
    );
}
