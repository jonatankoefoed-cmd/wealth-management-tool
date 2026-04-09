"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Plus, Sparkles, Trash2, Wallet, TrendingUp, BriefcaseBusiness, SlidersHorizontal } from "lucide-react";
import { calculateTax } from "@/src/lib/tax";
import { useProjectionModel } from "@/hooks/use-projection-model";
import { normalizeHousingInput, createDefaultHousingInput } from "@/src/housing/defaults";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BudgetCharts } from "@/components/today/budget/budget-charts";
import { BudgetMatrix } from "@/components/today/budget/budget-matrix";
import { SectionLoading } from "@/components/shared/section-loading";
import { formatDKK, formatPercent } from "@/lib/format";

type BudgetCategory = {
  category: string;
  amount: number;
  group: string;
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

function monthKeyFrom(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default function BudgetPage() {
  const { inputs, updateInputs, applyBudgetPreset, loading } = useProjectionModel();

  const budgetData = useMemo(() => {
    if (!inputs) return null;

    const year = new Date().getFullYear();
    const baseline = inputs.baseline || {};
    const housing = normalizeHousingInput(inputs.housing ?? createDefaultHousingInput(year));
    const annualBonus = numberOr(baseline.annualBonus);
    const monthlyGross = numberOr(baseline.monthlyGrossIncome, 65_000);
    const savingsRate = normalizePercent(baseline.savingsRatePct, 0);
    const fixedContribution = numberOr(baseline.monthlyLiquidSavings, 5_000);
    const rawCategories = ((inputs.budget_categories as BudgetCategory[] | undefined) ?? []).map((category) => ({
      ...category,
      amount: numberOr(category.amount),
      group: GROUPS.includes(category.group as (typeof GROUPS)[number]) ? category.group : "Other",
    }));

    const grouped = GROUPS.reduce(
      (acc, group) => {
        acc[group] = 0;
        return acc;
      },
      {} as Record<(typeof GROUPS)[number], number>,
    );

    for (const category of rawCategories) {
      grouped[category.group as (typeof GROUPS)[number]] += numberOr(category.amount);
    }

    const purchasePrice = numberOr(housing.purchase?.price);
    grouped.Housing +=
      numberOr(housing.budgetIntegration?.monthlyHousingRunningCosts) +
      numberOr(housing.budgetIntegration?.associationFees) +
      (purchasePrice * numberOr(housing.budgetIntegration?.propertyTaxRate, 0.0051)) / 12 +
      (purchasePrice * numberOr(housing.budgetIntegration?.landTaxRate, 0.008)) / 12;
    grouped.Utilities += numberOr(housing.budgetIntegration?.utilities);
    grouped.Insurance += numberOr(housing.budgetIntegration?.insurance);

    const tax = calculateTax({
      taxYear: year,
      municipality: { rate: 0.2505, churchRate: 0.007 },
      personalIncome: {
        salaryGross: monthlyGross * 12,
        bonusGross: annualBonus,
        atp: 1_135,
      },
    });

    const monthlyTax = {
      amBidrag: numberOr(tax.breakdown.personal?.breakdown?.amBidrag) / 12,
      kommune: numberOr(tax.breakdown.personal?.breakdown?.municipalTax) / 12,
      church: numberOr(tax.breakdown.personal?.breakdown?.churchTax) / 12,
      bottom: numberOr(tax.breakdown.personal?.breakdown?.bottomTax) / 12,
      middle: numberOr(tax.breakdown.personal?.breakdown?.middleTax) / 12,
      top: numberOr(tax.breakdown.personal?.breakdown?.topTax) / 12,
      equity: numberOr(tax.totals.equityTaxTotal) / 12,
      ask: numberOr(tax.totals.askTaxTotal) / 12,
      capital: numberOr(tax.totals.capitalTaxTotal) / 12,
      total: numberOr(tax.totals.totalTax) / 12,
    };

    const totalExpenses = Object.values(grouped).reduce((sum, amount) => sum + amount, 0);
    const averageNetAfterTax = monthlyGross + annualBonus / 12 - monthlyTax.total;
    const invest = savingsRate > 0 ? averageNetAfterTax * savingsRate : fixedContribution;

    const months = Array.from({ length: 12 }, (_, monthIndex) => {
      const bonus = monthIndex === 2 ? annualBonus : 0;
      const totalIncome = monthlyGross + bonus;
      const netDisposable = totalIncome - monthlyTax.total - totalExpenses;
      return {
        monthKey: monthKeyFrom(year, monthIndex),
        income: {
          salary: monthlyGross,
          bonus,
          other: 0,
          total: totalIncome,
        },
        expenses: {
          housing: grouped.Housing,
          utilities: grouped.Utilities,
          transport: grouped.Transport,
          food: grouped.Food,
          subscriptions: grouped.Subscriptions,
          insurance: grouped.Insurance,
          other: grouped.Other,
          total: totalExpenses,
        },
        tax: monthlyTax,
        netDisposable,
        allocations: {
          invest,
          liquidSavings: 0,
          residual: netDisposable - invest,
        },
      };
    });

    const yearly = months.reduce(
      (acc, month) => {
        acc.income.salary += month.income.salary;
        acc.income.bonus += month.income.bonus;
        acc.income.other += month.income.other;
        acc.income.total += month.income.total;
        acc.expenses.housing += month.expenses.housing;
        acc.expenses.utilities += month.expenses.utilities;
        acc.expenses.transport += month.expenses.transport;
        acc.expenses.food += month.expenses.food;
        acc.expenses.subscriptions += month.expenses.subscriptions;
        acc.expenses.insurance += month.expenses.insurance;
        acc.expenses.other += month.expenses.other;
        acc.expenses.total += month.expenses.total;
        acc.tax.amBidrag += month.tax.amBidrag;
        acc.tax.kommune += month.tax.kommune;
        acc.tax.church += month.tax.church;
        acc.tax.bottom += month.tax.bottom;
        acc.tax.middle += month.tax.middle;
        acc.tax.top += month.tax.top;
        acc.tax.equity += month.tax.equity;
        acc.tax.ask += month.tax.ask;
        acc.tax.capital += month.tax.capital;
        acc.tax.total += month.tax.total;
        acc.netDisposable += month.netDisposable;
        acc.allocations.invest += month.allocations.invest;
        acc.allocations.liquidSavings += month.allocations.liquidSavings;
        acc.allocations.residual += month.allocations.residual;
        return acc;
      },
      {
        income: { salary: 0, bonus: 0, other: 0, total: 0 },
        expenses: { housing: 0, utilities: 0, transport: 0, food: 0, subscriptions: 0, insurance: 0, other: 0, total: 0 },
        tax: { amBidrag: 0, kommune: 0, church: 0, bottom: 0, middle: 0, top: 0, equity: 0, ask: 0, capital: 0, total: 0 },
        netDisposable: 0,
        allocations: { invest: 0, liquidSavings: 0, residual: 0 },
      },
    );

    return {
      year,
      grouped,
      rawCategories,
      monthlyGross,
      annualBonus,
      invest,
      savingsRate,
      months,
      yearly,
    };
  }, [inputs]);

  if (loading || !inputs || !budgetData) {
    return <SectionLoading />;
  }

  const baseline = inputs.baseline || {};
  const returns = inputs.return_assumptions || { equityPct: 0.07 };
  const addCategory = () => {
    const categories = (inputs.budget_categories as BudgetCategory[] | undefined) ?? [];
    updateInputs({
      budget_categories: [
        ...categories,
        { category: "Ny kategori", amount: 0, group: "Other", type: "variable" },
      ],
    });
  };

  const updateCategory = (index: number, updates: Partial<BudgetCategory>) => {
    const categories = [ ...(((inputs.budget_categories as BudgetCategory[] | undefined) ?? [])) ];
    categories[index] = { ...categories[index], ...updates };
    updateInputs({ budget_categories: categories });
  };

  const removeCategory = (index: number) => {
    const categories = (((inputs.budget_categories as BudgetCategory[] | undefined) ?? [])).filter((_, categoryIndex) => categoryIndex !== index);
    updateInputs({ budget_categories: categories });
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-brand-border/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(250,248,239,0.96))] shadow-card">
          <CardContent className="space-y-5 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Primary workspace</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-text1">Monthly P&amp;L and editable assumptions</h2>
              </div>
              <Link href="/input">
                <Button variant="ghost" className="gap-2 rounded-full border border-brand-border bg-white px-4 text-brand-text2 hover:bg-brand-surface">
                  <SlidersHorizontal className="h-4 w-4" />
                  Advanced assumptions
                </Button>
              </Link>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-brand-text2">
              Edit the monthly engine directly here. Income, spending and savings strategy update the P&amp;L immediately,
              while housing, debt and tax detail stay available under advanced assumptions.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="ghost"
                className="gap-2 rounded-full border border-brand-accent/20 bg-brand-accent/5 px-4 text-brand-text1 hover:bg-brand-accent/10"
                onClick={() => applyBudgetPreset?.("sophisticated_research")}
              >
                <Sparkles className="h-4 w-4 text-brand-accent" />
                Apply research baseline
              </Button>
              <Link href="/portfolio">
                <Button variant="ghost" className="gap-2 rounded-full border border-brand-border bg-white px-4 text-brand-text2 hover:bg-brand-surface">
                  Open portfolio forecast
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <KpiCard title="Monthly Disposable" value={formatDKK(budgetData.months[0].netDisposable)} icon={Wallet} />
          <KpiCard title="Investable Amount" value={formatDKK(budgetData.invest)} icon={BriefcaseBusiness} />
          <KpiCard
            title="Savings Rate"
            value={budgetData.savingsRate > 0 ? formatPercent(budgetData.savingsRate, 0) : "Fixed amount"}
            icon={TrendingUp}
            status={budgetData.months[0].allocations.residual >= 0 ? "SUCCESS" : "WARNING"}
            statusLabel={budgetData.months[0].allocations.residual >= 0 ? "Positive residual" : "Negative residual"}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-brand-border/70 bg-brand-surface shadow-soft">
          <CardHeader>
            <CardTitle>Core assumptions</CardTitle>
            <CardDescription>Update the three inputs that move your monthly budget the most.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="income" className="space-y-4">
              <TabsList className="h-auto rounded-full bg-brand-surface2 p-1">
                <TabsTrigger value="income" className="rounded-full px-4 py-2 text-xs data-[state=active]:shadow-none">Income</TabsTrigger>
                <TabsTrigger value="spend" className="rounded-full px-4 py-2 text-xs data-[state=active]:shadow-none">Spend</TabsTrigger>
                <TabsTrigger value="strategy" className="rounded-full px-4 py-2 text-xs data-[state=active]:shadow-none">Strategy</TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-brand-text2">
                    <span>Månedlig bruttoløn</span>
                    <input
                      type="number"
                      value={numberOr(baseline.monthlyGrossIncome, 65_000)}
                      onChange={(event) => updateInputs({ baseline: { ...baseline, monthlyGrossIncome: Number(event.target.value) } })}
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-lg font-semibold tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-brand-text2">
                    <span>Årlig bonus</span>
                    <input
                      type="number"
                      value={numberOr(baseline.annualBonus, 0)}
                      onChange={(event) => updateInputs({ baseline: { ...baseline, annualBonus: Number(event.target.value) } })}
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-lg font-semibold tabular-nums"
                    />
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="spend" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-brand-text1">Budget categories</p>
                  <Button variant="ghost" className="gap-2 text-brand-text2" onClick={addCategory}>
                    <Plus className="h-4 w-4" />
                    Add line
                  </Button>
                </div>
                <div className="space-y-3">
                  {budgetData.rawCategories.map((category, index) => (
                    <div key={`${category.category}-${index}`} className="grid gap-3 rounded-2xl border border-brand-border bg-white p-4 md:grid-cols-[1.4fr_0.7fr_0.8fr_auto]">
                      <input
                        type="text"
                        value={category.category}
                        onChange={(event) => updateCategory(index, { category: event.target.value })}
                        className="rounded-xl border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        value={numberOr(category.amount)}
                        onChange={(event) => updateCategory(index, { amount: Number(event.target.value) })}
                        className="rounded-xl border border-brand-border bg-brand-surface2 px-3 py-2 text-sm tabular-nums"
                      />
                      <select
                        value={category.group}
                        onChange={(event) => updateCategory(index, { group: event.target.value })}
                        className="rounded-xl border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
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
                        className="rounded-xl border border-brand-border px-3 text-brand-text3 transition-colors hover:border-brand-danger/20 hover:text-brand-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="strategy" className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-brand-text2">
                    <span>Savings rate (%)</span>
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
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-lg font-semibold tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-brand-text2">
                    <span>Fixed investment amount</span>
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
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-lg font-semibold tabular-nums"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-brand-text2">
                    <span>Expected equity return (%)</span>
                    <input
                      type="number"
                      value={(normalizePercent(returns.equityPct, 0.07) * 100).toFixed(1)}
                      onChange={(event) =>
                        updateInputs({
                          return_assumptions: {
                            ...returns,
                            equityPct: Number(event.target.value) / 100,
                          },
                        })
                      }
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-lg font-semibold tabular-nums"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-brand-text2">
                    <span>Forecast horizon (months)</span>
                    <input
                      type="number"
                      value={numberOr(inputs.months, 120)}
                      onChange={(event) => updateInputs({ months: Number(event.target.value) })}
                      className="w-full rounded-2xl border border-brand-border bg-white px-4 py-3 text-lg font-semibold tabular-nums"
                    />
                  </label>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <BudgetCharts months={budgetData.months} yearly={budgetData.yearly} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-text1">Monthly P&amp;L matrix</h2>
            <p className="text-sm text-brand-text2">Live view of your income, tax, spend and remaining cash flow.</p>
          </div>
          <div className="rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-xs font-medium text-brand-text2">
            {budgetData.year}
          </div>
        </div>
        <BudgetMatrix data={{ year: budgetData.year, months: budgetData.months, yearly: budgetData.yearly }} />
      </section>
    </div>
  );
}
