import { useProjectionModel } from "@/hooks/use-projection-model";
import { FormField } from "./shared";
import { Info, Wallet, ShoppingBag, Plus, Trash2, TrendingUp, Sparkles, Utensils, Zap, Bus, Calendar, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

const GROUP_ICONS: Record<string, any> = {
    'Mad': Utensils,
    'Abonnementer': Zap,
    'Transport': Bus,
    'Fritid': ShoppingBag,
    'Andet': HeartHandshake,
};

export function BudgetCategoriesTab() {
    const { inputs, updateInputs, applyBudgetPreset, loading } = useProjectionModel();

    if (loading || !inputs) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading budget data...</div>;
    }

    const baseline = inputs.baseline || {
        monthlyDisposableIncomeBeforeHousing: 35000,
        monthlyNonHousingExpenses: 20000,
        expenseInflationRate: 0.02
    };

    const categories = inputs.budget_categories || [];

    const grouped = categories.reduce((acc, cat) => {
        if (!acc[cat.group]) acc[cat.group] = [];
        acc[cat.group].push(cat);
        return acc;
    }, {} as Record<string, typeof categories>);

    const setInflation = (val: number) => {
        updateInputs({ baseline: { ...baseline, expenseInflationRate: val } });
    };

    const totalMonthly = categories.reduce((acc, c) => acc + c.amount, 0);

    const updateCategory = (idx: number, field: string, val: any) => {
        const next = [...categories];
        next[idx] = { ...next[idx], [field]: val };
        const newTotal = next.reduce((acc, c) => acc + c.amount, 0);
        updateInputs({
            budget_categories: next,
            baseline: { ...baseline, monthlyNonHousingExpenses: newTotal }
        });
    };

    const removeCategory = (idx: number) => {
        const next = categories.filter((_, i) => i !== idx);
        const newTotal = next.reduce((acc, c) => acc + c.amount, 0);
        updateInputs({
            budget_categories: next,
            baseline: { ...baseline, monthlyNonHousingExpenses: newTotal }
        });
    };

    const addCategory = (group: string) => {
        const next = [...categories, { category: "New Item", amount: 0, group, type: 'variable' }];
        updateInputs({ budget_categories: next as any });
    };

    return (
        <div className="space-y-10 max-w-4xl animate-fade-in-up">

            {/* Header & Presets */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-brand-text1">Budget & Categories</h2>
                    <p className="text-sm text-brand-text3">Define your monthly spending habits for high-fidelity projections.</p>
                </div>

                <Button
                    onClick={() => applyBudgetPreset?.('sophisticated_research')}
                    variant="outline"
                    className="group border-brand-accent/30 bg-brand-accent/5 hover:bg-brand-accent/10 text-brand-accent gap-2 h-11 px-6 rounded-2xl shadow-soft transition-all active:scale-95"
                >
                    <Sparkles className="w-4 h-4 fill-brand-accent/20 group-hover:scale-110 transition-transform" />
                    <div className="text-left leading-tight">
                        <p className="text-xs font-bold uppercase tracking-wider">Apply Research Data</p>
                        <p className="text-[10px] opacity-70">Populate from cost estimates Excel</p>
                    </div>
                </Button>
            </div>

            {/* Global Assumptions */}
            <section className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-border/50">
                    <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary">
                        <TrendingUp className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-text1">
                        Global Assumptions
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField label="Annual Inflation Rate (%)">
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.1"
                                value={(baseline.expenseInflationRate ?? 0.02) * 100}
                                onChange={e => setInflation(Number(e.target.value) / 100)}
                                className="flex-1 accent-brand-accent"
                            />
                            <span className="text-sm font-semibold tabular-nums min-w-[3rem] text-right">
                                {((baseline.expenseInflationRate ?? 0.02) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-xs text-brand-text3 mt-1.5">Expected yearly increase in cost of living.</p>
                    </FormField>

                    <div className="p-4 bg-brand-surface2 border border-brand-border rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-brand-text3">Total Monthly Spend</p>
                            <p className="text-2xl font-bold tabular-nums text-brand-accent">
                                {totalMonthly > 0 ? totalMonthly.toLocaleString() : baseline.monthlyNonHousingExpenses.toLocaleString()} <span className="text-sm font-medium opacity-50">DKK</span>
                            </p>
                        </div>
                        <div className="p-2.5 bg-brand-accent/10 rounded-xl text-brand-accent">
                            <Wallet className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Detailed Categories */}
            <section className="space-y-8">
                {Object.entries(grouped).map(([group, cats]) => {
                    const Icon = GROUP_ICONS[group] || ShoppingBag;
                    return (
                        <div key={group} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-surface border border-brand-border rounded-xl text-brand-text2">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-sm font-bold text-brand-text1">{group}</h4>
                                </div>
                                <Button
                                    onClick={() => addCategory(group)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] font-bold uppercase tracking-widest text-brand-text3 hover:text-brand-accent"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add Item
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {cats.map((cat) => {
                                    const realIdx = categories.findIndex(c => c === cat);
                                    return (
                                        <div key={realIdx} className="group flex items-center gap-4 p-4 bg-brand-surface2/30 rounded-2xl border border-brand-border hover:border-brand-accent/20 hover:bg-brand-surface transition-all">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={cat.category}
                                                    onChange={e => updateCategory(realIdx, 'category', e.target.value)}
                                                    className="w-full bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 outline-none text-brand-text1"
                                                />
                                            </div>
                                            <div className="w-32 border-l border-brand-border pl-4 flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={cat.amount}
                                                    onChange={e => updateCategory(realIdx, 'amount', Number(e.target.value))}
                                                    className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 tabular-nums outline-none text-brand-accent"
                                                />
                                                <span className="text-[10px] font-bold text-brand-text3 opacity-50 uppercase">mo</span>
                                            </div>
                                            <button
                                                onClick={() => removeCategory(realIdx)}
                                                className="p-2 text-brand-text3 hover:text-brand-danger transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {categories.length === 0 && (
                    <div className="p-12 border-2 border-dashed border-brand-border rounded-[2.5rem] text-center space-y-4">
                        <div className="w-16 h-16 bg-brand-surface2 rounded-3xl flex items-center justify-center mx-auto">
                            <ShoppingBag className="w-8 h-8 text-brand-text3 opacity-20" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-brand-text1 text-lg">Detailed Budget is Empty</p>
                            <p className="text-sm text-brand-text3 max-w-xs mx-auto">Use the research preset or add your own spending categories manually.</p>
                        </div>
                        <Button
                            onClick={() => applyBudgetPreset?.('sophisticated_research')}
                            className="bg-brand-accent text-brand-textInvert rounded-xl px-6 h-10 gap-2 shadow-soft hover:scale-105 transition-transform"
                        >
                            <Sparkles className="w-4 h-4" /> Apply Research Estimates
                        </Button>
                    </div>
                )}
            </section>

            {/* Info Note */}
            <div className="bg-brand-accent/5 p-6 rounded-[2rem] border border-brand-accent/10 text-sm text-brand-text2 flex gap-4">
                <Info className="w-5 h-5 text-brand-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-bold text-brand-text1">Sophisticated Integration</p>
                    <p className="leading-relaxed opacity-80">
                        Applying the research data will populate categories based on your **Budget cost estimates.xlsx**.
                        Holidays detected in the budget (Vietnam, France, etc.) be found in the **Events** tab.
                    </p>
                </div>
            </div>

        </div>
    );
}
