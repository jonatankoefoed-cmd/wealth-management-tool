"use client";

import { useProjectionModel } from "@/hooks/use-projection-model";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLoading } from "@/components/shared/section-loading";
import { Plus, Trash2 } from "lucide-react";

type BudgetCategory = {
  category: string;
  amount: number;
  group: string;
  type: "fixed" | "variable";
};

type IncomeCategory = {
  category: string;
  amount: number;
  type: "fixed" | "variable";
};

const GROUPS = ["Housing", "Utilities", "Transport", "Food", "Subscriptions", "Insurance", "Other"] as const;

function numberOr(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePercent(value: unknown, fallback = 0): number {
  const parsed = numberOr(value, fallback);
  return Math.abs(parsed) > 1 ? parsed / 100 : parsed;
}

export default function BudgetInputsPage() {
  const { inputs, updateInputs, loading } = useProjectionModel();

  if (loading || !inputs) {
    return <SectionLoading />;
  }

  const baseline: any = inputs.baseline || {};
  const returns: any = inputs.return_assumptions || { equityPct: 0.07 };
  const rawCategories = ((inputs.budget_categories as BudgetCategory[] | undefined) ?? []);
  const rawIncome = ((inputs.income_categories as IncomeCategory[] | undefined) ?? []);

  const addCategory = () => {
    updateInputs({
      budget_categories: [
        ...rawCategories,
        { category: "Ny kategori", amount: 0, group: "Other", type: "variable" },
      ],
    });
  };

  const updateCategory = (index: number, updates: Partial<BudgetCategory>) => {
    const categories = [ ...rawCategories ];
    categories[index] = { ...categories[index], ...updates };
    updateInputs({ budget_categories: categories });
  };

  const removeCategory = (index: number) => {
    const categories = rawCategories.filter((_, categoryIndex) => categoryIndex !== index);
    updateInputs({ budget_categories: categories });
  };

  const addIncomeCategory = () => {
    updateInputs({
      income_categories: [
        ...rawIncome,
        { category: "Ny indkomst", amount: 0, type: "variable" },
      ],
    });
  };

  const updateIncomeCategory = (index: number, updates: Partial<IncomeCategory>) => {
    const categories = [ ...rawIncome ];
    categories[index] = { ...categories[index], ...updates };
    updateInputs({ income_categories: categories });
  };

  const removeIncomeCategory = (index: number) => {
    const categories = rawIncome.filter((_, categoryIndex) => categoryIndex !== index);
    updateInputs({ income_categories: categories });
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-brand-text1">Assumptions Control Center</h2>
          <p className="text-sm text-brand-text2">
            Manage all your income, expenses, and strategic inputs that flow into the monthly P&L.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Base Strategy & Anchors */}
          <Card className="border-brand-border/70 bg-brand-surface shadow-soft h-fit">
            <CardHeader className="border-b border-brand-border/50 bg-brand-surface2/50 pb-4">
              <CardTitle>Base Strategy</CardTitle>
              <CardDescription>Core drivers of your financial simulation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-brand-text2">
                  <span className="font-medium text-brand-text1 flex items-center gap-1">Månedlig bruttoløn</span>
                  <input
                    type="number"
                    value={numberOr(baseline.monthlyGrossIncome, 65_000)}
                    onChange={(event) => updateInputs({ baseline: { ...baseline, monthlyGrossIncome: Number(event.target.value) } })}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 font-semibold tabular-nums shadow-sm transition-colors focus:border-brand-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text2">
                  <span className="font-medium text-brand-text1 flex items-center gap-1">Årlig bonus</span>
                  <input
                    type="number"
                    value={numberOr(baseline.annualBonus, 0)}
                    onChange={(event) => updateInputs({ baseline: { ...baseline, annualBonus: Number(event.target.value) } })}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 font-semibold tabular-nums shadow-sm transition-colors focus:border-brand-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text2">
                  <span className="font-medium text-brand-text1 flex items-center gap-1">Savings rate (%)</span>
                  <input
                    type="number"
                    value={(normalizePercent(baseline.savingsRatePct, 0) * 100).toFixed(0)}
                    onChange={(event) =>
                      updateInputs({
                        baseline: {
                          ...baseline,
                          savingsRatePct: Number(event.target.value) / 100,
                          monthlyLiquidSavings: baseline.monthlyLiquidSavings,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 font-semibold tabular-nums shadow-sm transition-colors focus:border-brand-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text2">
                  <span className="font-medium text-brand-text1 flex items-center gap-1">Fixed investment (DKK)</span>
                  <input
                    type="number"
                    value={numberOr(baseline.monthlyLiquidSavings, 5_000)}
                    onChange={(event) =>
                      updateInputs({
                        baseline: {
                          ...baseline,
                          monthlyLiquidSavings: Number(event.target.value),
                          savingsRatePct: 0,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 font-semibold tabular-nums shadow-sm transition-colors focus:border-brand-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text2">
                  <span className="font-medium text-brand-text1 flex items-center gap-1">Udvidet lønstigning (%)</span>
                  <input
                    type="number"
                    value={(normalizePercent(baseline.salaryGrowthPct, 0.02) * 100).toFixed(1)}
                    onChange={(event) =>
                      updateInputs({
                        baseline: {
                          ...baseline,
                          salaryGrowthPct: Number(event.target.value) / 100,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 font-semibold tabular-nums shadow-sm transition-colors focus:border-brand-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text2">
                  <span className="font-medium text-brand-text1 flex items-center gap-1">Årlig inflation (%)</span>
                  <input
                    type="number"
                    value={(normalizePercent(baseline.inflationRatePct, 0.02) * 100).toFixed(1)}
                    onChange={(event) =>
                      updateInputs({
                        baseline: {
                          ...baseline,
                          inflationRatePct: Number(event.target.value) / 100,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 font-semibold tabular-nums shadow-sm transition-colors focus:border-brand-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text2">
                  <span className="font-medium text-brand-text1 flex items-center gap-1">Expected equity return (%)</span>
                  <input
                    type="number"
                    value={(normalizePercent(returns.equityPct, 0.07) * 100).toFixed(1)}
                    onChange={(event) =>
                      updateInputs({
                        return_assumptions: { ...returns, equityPct: Number(event.target.value) / 100 },
                      })
                    }
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 font-semibold tabular-nums shadow-sm transition-colors focus:border-brand-accent focus:outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-text2">
                  <span className="font-medium text-brand-text1 flex items-center gap-1">Forecast horizon (mdr)</span>
                  <input
                    type="number"
                    value={numberOr(inputs.months, 120)}
                    onChange={(event) => updateInputs({ months: Number(event.target.value) })}
                    className="w-full rounded-xl border border-brand-border bg-white px-3 py-2.5 font-semibold tabular-nums shadow-sm transition-colors focus:border-brand-accent focus:outline-none"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            {/* Custom Income */}
            <Card className="border-brand-border/70 bg-brand-surface shadow-soft flex-1">
              <CardHeader className="border-b border-brand-border/50 bg-brand-surface2/50 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Additional Income streams</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 h-8 text-brand-text2 rounded-full hover:bg-brand-surface border border-brand-border" onClick={addIncomeCategory}>
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {rawIncome.length === 0 && (
                    <p className="text-xs text-brand-text3 text-center py-2">No additional income added.</p>
                  )}
                  {rawIncome.map((category, index) => (
                    <div key={`inc-${index}`} className="grid gap-2 grid-cols-[1.5fr_1fr_auto]">
                      <input
                        type="text"
                        value={category.category}
                        onChange={(event) => updateIncomeCategory(index, { category: event.target.value })}
                        className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-accent focus:outline-none"
                        placeholder="Income name"
                      />
                      <input
                        type="number"
                        value={numberOr(category.amount)}
                        onChange={(event) => updateIncomeCategory(index, { amount: Number(event.target.value) })}
                        className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:border-brand-accent focus:outline-none"
                        placeholder="0 DKK"
                      />
                      <button
                        type="button"
                        onClick={() => removeIncomeCategory(index)}
                        className="rounded-xl border border-brand-border px-3 text-brand-text3 bg-white shadow-sm transition-colors hover:border-brand-danger/20 hover:text-brand-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Expenses */}
            <Card className="border-brand-border/70 bg-brand-surface shadow-soft flex-1">
              <CardHeader className="border-b border-brand-border/50 bg-brand-surface2/50 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Custom Budget lines</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 h-8 text-brand-text2 rounded-full hover:bg-brand-surface border border-brand-border" onClick={addCategory}>
                  <Plus className="h-3 w-3" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {rawCategories.map((category, index) => (
                    <div key={`exp-${index}`} className="grid gap-2 grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
                      <input
                        type="text"
                        value={category.category}
                        onChange={(event) => updateCategory(index, { category: event.target.value })}
                        className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-accent focus:outline-none"
                        placeholder="Expense name"
                      />
                      <input
                        type="number"
                        value={numberOr(category.amount)}
                        onChange={(event) => updateCategory(index, { amount: Number(event.target.value) })}
                        className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm tabular-nums shadow-sm focus:border-brand-accent focus:outline-none"
                      />
                      <select
                        value={category.group}
                        onChange={(event) => updateCategory(index, { group: event.target.value })}
                        className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-accent focus:outline-none"
                      >
                        {GROUPS.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeCategory(index)}
                        className="rounded-xl border border-brand-border px-3 text-brand-text3 bg-white shadow-sm transition-colors hover:border-brand-danger/20 hover:text-brand-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
