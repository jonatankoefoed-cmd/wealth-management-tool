import { useProjectionModel } from "@/hooks/use-projection-model";
import { FormField } from "./shared";
import { PiggyBank, TrendingUp, PieChart, Info, ArrowUpRight, Wallet, Percent } from "lucide-react";
import { formatDKK } from "@/lib/format";
import { cn } from "@/lib/cn";

export function AllocationTab() {
    const { inputs, updateInputs, loading } = useProjectionModel();

    if (loading || !inputs) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse font-medium">Loading allocation engine...</div>;
    }

    const baseline = inputs.baseline || {
        monthlyDisposableIncomeBeforeHousing: 35000,
        monthlyNonHousingExpenses: 20000,
        monthlyLiquidSavings: 5000,
        savingsRatePct: 0
    };
    const returns = inputs.return_assumptions || { equityPct: 0.07, bondPct: 0.03 };

    const monthlyGross = baseline.monthlyGrossIncome || 65000;
    const estimatedNet = baseline.monthlyDisposableIncomeBeforeHousing || 35000;
    const savingsRate = baseline.savingsRatePct || 0;
    const calculatedInvestment = savingsRate > 0 ? estimatedNet * savingsRate : (baseline.monthlyLiquidSavings || 5000);

    const updateSavingsRate = (pct: number) => {
        updateInputs({ baseline: { ...baseline, savingsRatePct: pct / 100 } });
    };

    const updateFlatSavings = (val: number) => {
        updateInputs({ baseline: { ...baseline, monthlyLiquidSavings: val, savingsRatePct: 0 } });
    };

    return (
        <div className="space-y-12 max-w-5xl animate-fade-in-up pb-10">

            <header className="space-y-2">
                <h2 className="text-2xl font-bold text-brand-text1 tracking-tight">Financial Allocation</h2>
                <p className="text-brand-text2 text-sm max-w-2xl">Define how your monthly surplus is distributed between immediate liquidity and long-term performance.</p>
            </header>

            {/* Cash Flow Allocation Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-accent/10 rounded-xl text-brand-accent border border-brand-accent/10">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-brand-text1 uppercase tracking-widest">Savings Strategy</h3>
                            <p className="text-[11px] text-brand-text3 font-medium">Configure your monthly contribution engine</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-brand-surface2 border border-brand-border p-6 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                <PiggyBank className="w-32 h-32 text-brand-accent rotate-12" />
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-brand-text1">Investment Contribution</h4>
                                    <div className="flex gap-1 p-1 bg-brand-surface rounded-xl border border-brand-border/50">
                                        <button
                                            onClick={() => updateSavingsRate(20)}
                                            className={cn("px-3 py-1 text-[11px] font-bold rounded-lg transition-colors", savingsRate > 0 ? "bg-brand-accent text-brand-textInvert" : "text-brand-text2 hover:bg-brand-surface2")}
                                        >
                                            Percentage
                                        </button>
                                        <button
                                            onClick={() => updateFlatSavings(baseline.monthlyLiquidSavings || 5000)}
                                            className={cn("px-3 py-1 text-[11px] font-bold rounded-lg transition-colors", savingsRate === 0 ? "bg-brand-accent text-brand-textInvert" : "text-brand-text2 hover:bg-brand-surface2")}
                                        >
                                            Fixed Amount
                                        </button>
                                    </div>
                                </div>

                                {savingsRate > 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-end justify-between">
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-brand-text3">Savings Rate (%)</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-3xl font-bold tabular-nums text-brand-text1 tracking-tighter">{(savingsRate * 100).toFixed(0)}</span>
                                                    <Percent className="w-4 h-4 text-brand-accent mb-1" strokeWidth={3} />
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-brand-text3 uppercase tracking-wider mb-1">Estimated Monthly</p>
                                                <p className="text-xl font-bold text-brand-accent tracking-tight">{formatDKK(calculatedInvestment)}</p>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="80"
                                            step="1"
                                            value={savingsRate * 100}
                                            onChange={e => updateSavingsRate(Number(e.target.value))}
                                            className="w-full accent-brand-accent h-1.5 rounded-full bg-brand-border cursor-pointer"
                                        />
                                        <p className="text-[11px] text-brand-text3 leading-relaxed">
                                            Your contribution evolves automatically as your career progresses.
                                            Calculated from your current estimated net income of <span className="text-brand-text1 font-semibold">{formatDKK(estimatedNet)}</span>.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-brand-text3">Flat Amount (DKK/mo)</p>
                                            <div className="relative group/input">
                                                <input
                                                    type="number"
                                                    value={baseline.monthlyLiquidSavings || 5000}
                                                    onChange={e => updateFlatSavings(Number(e.target.value))}
                                                    className="w-full bg-brand-surface border border-brand-border rounded-2xl px-5 py-4 text-2xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all text-brand-text1 pr-16"
                                                />
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-text3 font-bold group-focus-within/input:text-brand-accent transition-colors">kr.</div>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-brand-text3 leading-relaxed">
                                            A fixed amount is contributed every month regardless of income fluctuations.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <div className="flex-1 bg-gradient-to-br from-brand-accent/5 to-brand-primary/5 border border-brand-accent/20 p-6 rounded-3xl flex flex-col justify-center gap-4 group hover:border-brand-accent/40 transition-colors shadow-soft hover:shadow-lg hover:shadow-brand-accent/5">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-brand-accent text-brand-textInvert rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20 group-hover:scale-110 transition-transform duration-300">
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                                <h5 className="text-sm font-bold text-brand-text1 uppercase tracking-tight">Residual Flow</h5>
                            </div>
                            <p className="text-sm text-brand-text2 leading-relaxed">
                                Our engine prioritizes your expenses and living costs. <span className="text-brand-text1 font-bold">100% of all monthly surplus</span> beyond your base buffer flows directly into your capital growth vehicles.
                            </p>
                        </div>

                        <div className="bg-brand-surface border border-brand-border p-5 rounded-2xl flex items-start gap-3">
                            <Info className="w-4 h-4 text-brand-text3 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-brand-text3 leading-snug">
                                Allocations are re-evaluated monthly. Any bonuses or salary increases will proportionally increase your investment power if using the percentage strategy.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Strategy & Governance Section */}
            <section className="space-y-6 pt-2">
                <div className="flex items-center gap-3 pb-3 border-b border-brand-border/40">
                    <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary border border-brand-primary/10">
                        <PieChart className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-brand-text1 uppercase tracking-widest">Portfolio Governance</h3>
                        <p className="text-[11px] text-brand-text3 font-medium">Rebalancing and return profile assumptions</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <FormField label="Strategy Methodology">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-brand-surface2 border border-brand-border rounded-2xl">
                                {(['simple', 'optimized'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => updateInputs({ investmentStrategy: s })}
                                        className={cn(
                                            "px-4 py-2.5 text-xs font-bold rounded-xl capitalize transition-all",
                                            (inputs.investmentStrategy || 'simple') === s
                                                ? "bg-brand-surface text-brand-accent shadow-soft border border-brand-border/50"
                                                : "text-brand-text3 hover:text-brand-text2"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-brand-text3 mt-3 leading-relaxed font-medium">
                                {inputs.investmentStrategy === 'optimized'
                                    ? "Advanced optimization including tax-loss harvesting and location priority."
                                    : "Passive methodology with periodic rebalancing to target weights."}
                            </p>
                        </FormField>

                        <FormField label="Rebalancing Protocol">
                            <div className="relative">
                                <select
                                    value={inputs.rebalancingFrequency || "yearly"}
                                    onChange={e => updateInputs({ rebalancingFrequency: e.target.value as any })}
                                    className="w-full rounded-2xl border border-brand-border bg-brand-surface2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all font-bold text-brand-text1 appearance-none cursor-pointer"
                                >
                                    <option value="none">Manual Discretionary</option>
                                    <option value="monthly">Systematic Monthly</option>
                                    <option value="yearly">Systematic Yearly</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <PieChart className="w-4 h-4 text-brand-text3" />
                                </div>
                            </div>
                        </FormField>
                    </div>

                    <div className="space-y-8 bg-brand-surface2/40 border border-brand-border p-8 rounded-[2rem]">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-brand-text1" />
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-brand-text1">Performance Targets</h4>
                        </div>

                        <div className="space-y-8">
                            <FormField label="Equity Market Baseline">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="h-1.5 flex-1 bg-brand-border rounded-full overflow-hidden mr-6">
                                            <div
                                                className="h-full bg-brand-accent rounded-full transition-all duration-500"
                                                style={{ width: `${(returns.equityPct * 100 / 15) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-black tabular-nums text-brand-text1">
                                            {(returns.equityPct * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="15"
                                        step="0.1"
                                        value={returns.equityPct * 100}
                                        onChange={e => updateInputs({ return_assumptions: { ...returns, equityPct: Number(e.target.value) / 100 } })}
                                        className="w-full accent-brand-accent h-1 opacity-0 absolute pointer-events-auto cursor-pointer"
                                    />
                                    <p className="text-[10px] text-brand-text3 font-medium italic">Expected long-term CAGR for diversified equity portfolio.</p>
                                </div>
                            </FormField>

                            <FormField label="Risk-Free / Fixed Income Rate">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="h-1.5 flex-1 bg-brand-border rounded-full overflow-hidden mr-6">
                                            <div
                                                className="h-full bg-brand-text2 rounded-full transition-all duration-500"
                                                style={{ width: `${(returns.bondPct * 100 / 8) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-black tabular-nums text-brand-text1">
                                            {(returns.bondPct * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="8"
                                        step="0.1"
                                        value={returns.bondPct * 100}
                                        onChange={e => updateInputs({ return_assumptions: { ...returns, bondPct: Number(e.target.value) / 100 } })}
                                        className="w-full accent-brand-accent h-1 opacity-0 absolute pointer-events-auto cursor-pointer"
                                    />
                                    <p className="text-[10px] text-brand-text3 font-medium italic">Expected return on cash deposits and high-grade bonds.</p>
                                </div>
                            </FormField>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}

