"use client";

import { useCallback, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SectionLoading } from "@/components/shared/section-loading";
import { AuditContent, type ExplainAudit } from "@/components/shared/explain-drawer";
import { WealthAreaChart, type AreaChartDataPoint } from "@/components/charts/area-chart";
import { WealthBarChart, type BarChartDataPoint } from "@/components/charts/bar-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";
import { DataDebugToggle } from "@/components/debug/data-debug-toggle";
import { ProjectionSpreadsheet } from "@/components/projection/projection-spreadsheet";
import {
  TrendingUp,
  Calendar,
  Wallet,
  Home,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ProjectionSeriesPoint } from "@/src/projection/types";

// Types matching API response
interface ProjectionResponse {
  input: any;
  result: {
    series: ProjectionSeriesPoint[];
    warnings: string[];
  };
}

interface ProjectionDefaults {
  defaults: {
    startMonth: string;
    months: number;
    includeHousing: boolean;
    startingBalanceSheet: {
      cash: number;
      portfolioValue: number;
    };
    baseline: {
      monthlyDisposableIncomeBeforeHousing: number;
      monthlyNonHousingExpenses: number;
    };
  };
}

interface PortfolioItem {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  avgCost: number;
  marketValue: number | null;
  currency: string;
  assetType: string;
  latestPrice?: number | null;
}

interface DebtItem {
  id: string;
  name: string;
  balance: number;
  rate: number;
  type: string;
  gracePeriodEnd?: string;
}

export default function ProjectionPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProjectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selected month for audit details
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Form state
  const [startMonth, setStartMonth] = useState("");
  const [months, setMonths] = useState(60);
  const [startCash, setStartCash] = useState(200000);
  const [startPortfolio, setStartPortfolio] = useState(500000);
  const [monthlyIncome, setMonthlyIncome] = useState(35000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(20000);
  const [includeHousing, setIncludeHousing] = useState(true);
  const [annualIncomeIncrease, setAnnualIncomeIncrease] = useState(2.0);

  // Real Data State
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioItem[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  // Fetch initial data
  useEffect(() => {
    async function init() {
      try {
        // 1. Fetch Defaults
        const defaults = await fetchJson<ProjectionDefaults>("/api/projection");
        setStartMonth(defaults.defaults.startMonth);
        setStartCash(defaults.defaults.startingBalanceSheet.cash);
        setStartPortfolio(defaults.defaults.startingBalanceSheet.portfolioValue);
        setMonthlyIncome(defaults.defaults.baseline.monthlyDisposableIncomeBeforeHousing);
        setMonthlyExpenses(defaults.defaults.baseline.monthlyNonHousingExpenses);

        // 2. Fetch Portfolio
        const portfolioRes = await fetchJson<{ buckets: any[] }>("/api/holdings");
        const holdings = portfolioRes.buckets.flatMap(b => b.positions).map((r: any) => ({
          id: r.instrumentId,
          ticker: r.ticker,
          name: r.name,
          quantity: r.quantity,
          avgCost: r.avgCost,
          marketValue: r.valueDKK,
          currency: r.currency,
          assetType: r.assetType || 'EQUITY',
          latestPrice: r.price
        }));
        setPortfolioHoldings(holdings);

        const totalPortfolioValue = holdings.reduce((sum, h) => sum + (h.marketValue || (h.quantity * (h.latestPrice || h.avgCost))), 0);
        if (totalPortfolioValue > 0) {
          setStartPortfolio(Math.round(totalPortfolioValue));
        }

        // 3. Fetch Debts
        const debtsRes = await fetchJson<{ debtAccounts: any[] }>("/api/debts");
        const debtItems = debtsRes.debtAccounts.map((d: any) => ({
          id: d.id,
          name: d.name,
          balance: d.initialBalance ?? 0,
          rate: (d.plan?.interestRateAnnual ?? 0.05), // Fallback or use correct field
          type: d.type || 'OTHER',
          gracePeriodEnd: d.plan?.gracePeriodEnds
        }));
        setDebts(debtItems);

      } catch (e) {
        console.error("Failed to fetch initial data", e);
      } finally {
        setFetchingData(false);
      }
    }
    init();
  }, []);

  const runProjection = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedMonthIndex(null); // Reset selection

    try {
      const mappedHoldings = portfolioHoldings.map(h => ({
        id: h.id,
        name: h.name,
        currentValue: h.marketValue || (h.quantity * (h.latestPrice || h.avgCost)),
        expectedReturnAnnual: 0.07,
        type: 'DEPOT'
      }));

      const mappedDebts = debts.map(d => ({
        id: d.id,
        name: d.name,
        principal: d.balance,
        interestRateAnnual: d.rate,
        type: d.type
      }));

      const response = await fetchJson<ProjectionResponse>("/api/projection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startMonth: startMonth || new Date().toISOString().slice(0, 7),
          months,
          includeHousing,
          startingBalanceSheet: {
            cash: startCash,
            portfolioValue: startPortfolio,
          },
          baseline: {
            monthlyDisposableIncomeBeforeHousing: monthlyIncome,
            monthlyNonHousingExpenses: monthlyExpenses,
            annualIncomeIncreasePercent: annualIncomeIncrease / 100,
          },
          debts: mappedDebts,
          holdings: mappedHoldings,
          monthlySavingsContribution: 5000
        }),
      });

      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke køre fremskrivning");
    } finally {
      setLoading(false);
    }
  }, [startMonth, months, startCash, startPortfolio, monthlyIncome, monthlyExpenses, includeHousing, portfolioHoldings, debts, annualIncomeIncrease]);

  // Derived state
  const series = data?.result.series ?? [];

  // Charts
  const netWorthChartData: AreaChartDataPoint[] = series.map((row) => ({
    label: row.month.slice(5),
    value: row.balanceSheet.netWorth,
  }));

  const cashFlowChartData: BarChartDataPoint[] = series.map((row) => ({
    label: row.month.slice(5),
    value: row.pnl.income + row.pnl.investmentIncome,
    secondary: row.pnl.totalExpenses,
  }));

  const firstRow = series[0];
  const lastRow = series[series.length - 1];
  const netWorthChange = lastRow && firstRow ? lastRow.balanceSheet.netWorth - firstRow.balanceSheet.netWorth : 0;
  const finalNetWorth = lastRow?.balanceSheet.netWorth ?? 0;

  // Selected audit
  const selectedAuditList = selectedMonthIndex !== null && series[selectedMonthIndex]
    ? series[selectedMonthIndex].audits
    : [];

  if (fetchingData) return <SectionLoading />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fremskrivningsparametre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Startmåned
              </label>
              <input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Varighed (måneder)
              </label>
              <input
                type="number"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                min={1}
                max={120}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Startformue (kontanter)
              </label>
              <input
                type="number"
                value={startCash}
                onChange={(e) => setStartCash(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Startformue (portefølje)
              </label>
              <input
                type="number"
                value={startPortfolio}
                onChange={(e) => setStartPortfolio(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Månedlig indkomst
              </label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Månedlige udgifter
              </label>
              <input
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Årlig lønstigning (%)
              </label>
              <input
                type="number"
                value={annualIncomeIncrease}
                onChange={(e) => setAnnualIncomeIncrease(Number(e.target.value))}
                step="0.1"
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeHousing}
                onChange={(e) => setIncludeHousing(e.target.checked)}
                className="rounded border-brand-border"
              />
              <span className="text-brand-text2">Inkluder boligkøb</span>
            </label>
          </div>

          <div className="mt-4 border-t border-brand-border pt-4">
            <p className="text-sm font-medium text-brand-text1 mb-2">Fundne data:</p>
            <div className="flex gap-4 text-xs text-brand-text2">
              <span>Portefølje: {portfolioHoldings.length} positioner ({formatDKK(portfolioHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0))})</span>
              <span>Gæld: {debts.length} lån ({formatDKK(debts.reduce((sum, d) => sum + (d.balance || 0), 0))})</span>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={runProjection}
            disabled={loading}
            className="mt-6"
          >
            {loading ? "Beregner..." : "Kør fremskrivning"}
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

      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Slutformue"
              value={formatDKK(finalNetWorth)}
              icon={TrendingUp}
              size="large"
              trend={{
                value: firstRow ? ((lastRow!.balanceSheet.netWorth - firstRow.balanceSheet.netWorth) / firstRow.balanceSheet.netWorth) * 100 : 0,
                direction: netWorthChange >= 0 ? "up" : "down",
              }}
            />
            <KpiCard
              title="Fremskrivningsperiode"
              value={`${series.length} måneder`}
              icon={Calendar}
            />
            <KpiCard
              title="Slutkontanter"
              value={formatDKK(lastRow?.balanceSheet.cash ?? 0)}
              icon={Wallet}
            />
            <KpiCard
              title="Slutgæld"
              value={formatDKK((lastRow?.balanceSheet.mortgageBalance || 0) + (lastRow?.balanceSheet.bankLoanBalance || 0) + (lastRow?.balanceSheet.otherLiabilities || 0))}
              icon={Home}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formueudvikling</CardTitle>
              </CardHeader>
              <CardContent>
                <WealthAreaChart
                  data={netWorthChartData}
                  height={320}
                  gradientId="netWorthGradient"
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Månedlig pengestrøm</CardTitle>
              </CardHeader>
              <CardContent>
                <WealthBarChart
                  data={cashFlowChartData}
                  height={280}
                  showSecondary={true}
                  stacked={false}
                  primaryLabel="Indkomst"
                  secondaryLabel="Udgifter"
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-1">
            <ProjectionSpreadsheet data={series} />
          </section>

          <Drawer
            open={selectedMonthIndex !== null}
            onOpenChange={(o) => !o && setSelectedMonthIndex(null)}
            title={selectedMonthIndex !== null ? `Detaljer for ${series[selectedMonthIndex].month}` : ""}
            description="Beregninger og forklaringer for denne måned."
          >
            <div className="p-4 overflow-y-auto max-h-[80vh] space-y-6">
              {selectedAuditList.length > 0 ? (
                selectedAuditList.map((audit, idx) => (
                  <div key={idx} className="border-b border-brand-border last:border-0 pb-4 last:pb-0">
                    <h4 className="text-sm font-semibold text-brand-text1 mb-3">{audit.title}</h4>
                    <AuditContent audit={audit} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-brand-text2">Ingen detaljer for denne måned.</p>
              )}
            </div>
          </Drawer>

          <DataDebugToggle source="/api/projection (POST)" data={data} />
        </>
      )}
    </div>
  );
}
