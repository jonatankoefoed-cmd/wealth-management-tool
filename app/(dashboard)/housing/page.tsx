"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLoading } from "@/components/shared/section-loading";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { DonutChart, type DonutChartDataPoint } from "@/components/charts/donut-chart";
import { WealthAreaChart, type AreaChartDataPoint } from "@/components/charts/area-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";
import { DataDebugToggle } from "@/components/debug/data-debug-toggle";
import { Home, Wallet, CreditCard, TrendingUp, Calculator } from "lucide-react";

interface HousingResult {
  input: {
    year: number;
    purchase: {
      price: number;
      downPaymentCash: number;
      closeDate: string;
    };
    financing: {
      mortgage: {
        enabled: boolean;
        termYears: number;
        bondRateNominalAnnual: number;
      };
      bankLoan: {
        enabled: boolean;
        termYears: number;
        rateNominalAnnual: number;
      };
    };
  };
  result: {
    summary: {
      purchasePrice: number;
      downPayment: number;
      totalTransactionCosts: number;
      mortgagePrincipal: number;
      bankLoanPrincipal: number;
      totalDebt: number;
      monthlyMortgagePayment: number;
      monthlyBankLoanPayment: number;
      totalMonthlyPayment: number;
      firstMonthInterest: number;
    };
    cashFlow: {
      upfrontCashNeeded: number;
      firstMonthCost: number;
    };
    balanceSheetImpact: {
      initialEquity: number;
      propertyAsset: number;
      totalLiabilities: number;
    };
    audits: ExplainAudit[];
  };
}

interface HousingDefaults {
  defaults: {
    year: number;
    purchasePrice: number;
    downPaymentPercent: number;
  };
}

export default function HousingPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HousingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [purchasePrice, setPurchasePrice] = useState(3000000);
  const [downPayment, setDownPayment] = useState(300000);
  const [mortgageRate, setMortgageRate] = useState(4);
  const [mortgageYears, setMortgageYears] = useState(30);
  const [bankLoanRate, setBankLoanRate] = useState(6.5);
  const [bankLoanYears, setBankLoanYears] = useState(10);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchJson<HousingResult>("/api/housing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: 2026,
          purchase: {
            price: purchasePrice,
            downPaymentCash: downPayment,
            closeDate: "2026-04-15",
          },
          financing: {
            mortgage: {
              enabled: true,
              termYears: mortgageYears,
              amortizationProfile: "FULL",
              bondRateNominalAnnual: mortgageRate / 100,
              contributionRateAnnual: 0.0075,
              paymentsPerYear: 12,
            },
            bankLoan: {
              enabled: true,
              rateNominalAnnual: bankLoanRate / 100,
              termYears: bankLoanYears,
              paymentsPerYear: 12,
            },
          },
          transactionCosts: {
            includeDefaultCosts: true,
            customCosts: [],
          },
          budgetIntegration: {
            monthlyDisposableIncomeBeforeHousing: 35000,
            monthlyHousingRunningCosts: 4000,
          },
          scenarioMeta: {
            scenarioId: "housing_simulation",
          },
        }),
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke køre boligsimulering");
    } finally {
      setLoading(false);
    }
  }, [purchasePrice, downPayment, mortgageRate, mortgageYears, bankLoanRate, bankLoanYears]);

  // Chart data
  const costBreakdownData: DonutChartDataPoint[] = result ? [
    { name: "Udbetaling", value: result.result.cashFlow.upfrontCashNeeded - (result.result.summary.totalTransactionCosts ?? 0), color: "#A4B0A3" },
    { name: "Omkostninger", value: result.result.summary.totalTransactionCosts, color: "#7E8187" },
  ] : [];

  const debtBreakdownData: DonutChartDataPoint[] = result ? [
    { name: "Realkreditlån", value: result.result.summary.mortgagePrincipal, color: "#A4B0A3" },
    { name: "Banklån", value: result.result.summary.bankLoanPrincipal, color: "#F9E8B0" },
  ] : [];

  const monthlyPaymentData: DonutChartDataPoint[] = result ? [
    { name: "Realkreditlån", value: result.result.summary.monthlyMortgagePayment, color: "#A4B0A3" },
    { name: "Banklån", value: result.result.summary.monthlyBankLoanPayment, color: "#F9E8B0" },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Boligkøbsparametre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Købspris
              </label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Udbetaling
              </label>
              <input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Realkreditrente (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={mortgageRate}
                onChange={(e) => setMortgageRate(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Realkreditløbetid (år)
              </label>
              <input
                type="number"
                value={mortgageYears}
                onChange={(e) => setMortgageYears(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Banklånsrente (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={bankLoanRate}
                onChange={(e) => setBankLoanRate(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Banklånsløbetid (år)
              </label>
              <input
                type="number"
                value={bankLoanYears}
                onChange={(e) => setBankLoanYears(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <Button
            variant="primary"
            onClick={runSimulation}
            disabled={loading}
            className="mt-6"
          >
            {loading ? "Beregner..." : "Kør boligsimulering"}
          </Button>
        </CardContent>
      </Card>

      {loading && <SectionLoading />}

      {error && (
        <Card className="border-brand-danger/30 bg-brand-danger/5">
          <CardContent className="p-4 text-sm text-brand-danger">
            {error}
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Summary KPIs */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Kontantbehov ved køb"
              value={formatDKK(result.result.cashFlow.upfrontCashNeeded)}
              icon={Wallet}
              size="large"
            />
            <KpiCard
              title="Månedlig ydelse"
              value={formatDKK(result.result.summary.totalMonthlyPayment)}
              icon={CreditCard}
            />
            <KpiCard
              title="Samlet gæld"
              value={formatDKK(result.result.summary.totalDebt)}
              icon={Home}
            />
            <KpiCard
              title="Startkapital"
              value={formatDKK(result.result.balanceSheetImpact.initialEquity)}
              icon={TrendingUp}
            />
          </section>

          {/* Charts Row */}
          <section className="grid gap-4 lg:grid-cols-3">
            {/* Upfront Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kontantbehov</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={costBreakdownData}
                  height={220}
                  innerRadius={45}
                  outerRadius={70}
                  showLegend={true}
                  centerValue={formatDKK(result.result.cashFlow.upfrontCashNeeded)}
                  centerLabel="I alt"
                />
              </CardContent>
            </Card>

            {/* Debt Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gældsfordeling</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={debtBreakdownData}
                  height={220}
                  innerRadius={45}
                  outerRadius={70}
                  showLegend={true}
                  centerValue={formatDKK(result.result.summary.totalDebt)}
                  centerLabel="Total gæld"
                />
              </CardContent>
            </Card>

            {/* Monthly Payment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Månedlig ydelse</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={monthlyPaymentData}
                  height={220}
                  innerRadius={45}
                  outerRadius={70}
                  showLegend={true}
                  centerValue={formatDKK(result.result.summary.totalMonthlyPayment)}
                  centerLabel="Pr. måned"
                />
              </CardContent>
            </Card>
          </section>

          {/* Balance Sheet Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Balance påvirkning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-sm text-brand-text2">Boligværdi (aktiv)</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-success">
                    {formatDKK(result.result.balanceSheetImpact.propertyAsset)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-brand-text2">Gæld (passiv)</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-danger">
                    {formatDKK(result.result.balanceSheetImpact.totalLiabilities)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-brand-text2">Egenkapital</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-brand-text1">
                    {formatDKK(result.result.balanceSheetImpact.initialEquity)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Details */}
          {result.result.audits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Beregningsdetaljer</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.result.audits.map((audit, index) => (
                  <ExplainDrawer key={index} audit={audit} />
                ))}
              </CardContent>
            </Card>
          )}

          <DataDebugToggle source="/api/housing (POST)" data={result} />
        </>
      )}
    </div>
  );
}
