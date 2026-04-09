"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLoading } from "@/components/shared/section-loading";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { DonutChart, type DonutChartDataPoint } from "@/components/charts/donut-chart";
import { WealthBarChart, type BarChartDataPoint } from "@/components/charts/bar-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";
import { DataDebugToggle } from "@/components/debug/data-debug-toggle";
import { Receipt, Percent, Wallet, Calculator } from "lucide-react";

interface TaxBreakdown {
  personalIncome: number;
  amTax: number;
  bottomTax: number;
  topTax: number;
  municipalTax: number;
  churchTax: number;
  equityTax: number;
  askTax: number;
  markToMarketTax: number;
  totalTax: number;
}

interface TaxResult {
  input: {
    year: number;
    grossSalary: number;
    equityGains: number;
    dividends: number;
    askGains: number;
    markToMarketGains: number;
  };
  result: {
    breakdown: TaxBreakdown;
    effectiveRate: number;
    netIncome: number;
    audits: ExplainAudit[];
  };
}

export default function TaxPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [grossSalary, setGrossSalary] = useState(600000);
  const [equityGains, setEquityGains] = useState(50000);
  const [dividends, setDividends] = useState(10000);
  const [askGains, setAskGains] = useState(15000);
  const [markToMarketGains, setMarkToMarketGains] = useState(20000);

  const runCalculation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchJson<TaxResult>("/api/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: 2024,
          grossSalary,
          equityGains,
          dividends,
          askGains,
          markToMarketGains,
        }),
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke beregne skat");
    } finally {
      setLoading(false);
    }
  }, [grossSalary, equityGains, dividends, askGains, markToMarketGains]);

  // Chart data
  const taxCompositionData: DonutChartDataPoint[] = result ? [
    { name: "AM-bidrag", value: result.result.breakdown.amTax, color: "#A4B0A3" },
    { name: "Bundskat", value: result.result.breakdown.bottomTax, color: "#7E8187" },
    { name: "Topskat", value: result.result.breakdown.topTax, color: "#F9E8B0" },
    { name: "Kommuneskat", value: result.result.breakdown.municipalTax, color: "#A7ACB4" },
    { name: "Kirkeskat", value: result.result.breakdown.churchTax, color: "#E8E5D4" },
  ].filter(d => d.value > 0) : [];

  const investmentTaxData: DonutChartDataPoint[] = result ? [
    { name: "Aktieskat", value: result.result.breakdown.equityTax, color: "#A4B0A3" },
    { name: "ASK-skat", value: result.result.breakdown.askTax, color: "#7E8187" },
    { name: "Lagerbeskatning", value: result.result.breakdown.markToMarketTax, color: "#F9E8B0" },
  ].filter(d => d.value > 0) : [];

  const taxBarData: BarChartDataPoint[] = result ? [
    { label: "AM", value: result.result.breakdown.amTax },
    { label: "Bund", value: result.result.breakdown.bottomTax },
    { label: "Top", value: result.result.breakdown.topTax },
    { label: "Komm.", value: result.result.breakdown.municipalTax },
    { label: "Aktie", value: result.result.breakdown.equityTax },
    { label: "ASK", value: result.result.breakdown.askTax },
    { label: "Lager", value: result.result.breakdown.markToMarketTax },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skatteberegningsparametre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Bruttoløn (årlig)
              </label>
              <input
                type="number"
                value={grossSalary}
                onChange={(e) => setGrossSalary(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Aktiegevinster
              </label>
              <input
                type="number"
                value={equityGains}
                onChange={(e) => setEquityGains(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Udbytter
              </label>
              <input
                type="number"
                value={dividends}
                onChange={(e) => setDividends(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                ASK-gevinster
              </label>
              <input
                type="number"
                value={askGains}
                onChange={(e) => setAskGains(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text2">
                Lagerbeskatning
              </label>
              <input
                type="number"
                value={markToMarketGains}
                onChange={(e) => setMarkToMarketGains(Number(e.target.value))}
                className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <Button
            variant="primary"
            onClick={runCalculation}
            disabled={loading}
            className="mt-6"
          >
            {loading ? "Beregner..." : "Beregn skat"}
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
              title="Samlet skat"
              value={formatDKK(result.result.breakdown.totalTax)}
              icon={Receipt}
              size="large"
            />
            <KpiCard
              title="Effektiv skatteprocent"
              value={`${result.result.effectiveRate.toFixed(1)}%`}
              icon={Percent}
            />
            <KpiCard
              title="Nettoindkomst"
              value={formatDKK(result.result.netIncome)}
              icon={Wallet}
            />
            <KpiCard
              title="Bruttoindkomst"
              value={formatDKK(grossSalary + equityGains + dividends + askGains + markToMarketGains)}
              icon={Calculator}
            />
          </section>

          {/* Charts Row */}
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Personal Tax Composition */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personlig indkomstskat</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={taxCompositionData}
                  height={260}
                  innerRadius={50}
                  outerRadius={80}
                  showLegend={true}
                  centerValue={`${result.result.effectiveRate.toFixed(0)}%`}
                  centerLabel="Effektiv"
                />
              </CardContent>
            </Card>

            {/* Investment Tax */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Investeringsskat</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={investmentTaxData}
                  height={260}
                  innerRadius={50}
                  outerRadius={80}
                  showLegend={true}
                  centerValue={formatDKK(
                    result.result.breakdown.equityTax +
                    result.result.breakdown.askTax +
                    result.result.breakdown.markToMarketTax
                  )}
                  centerLabel="I alt"
                />
              </CardContent>
            </Card>
          </section>

          {/* Tax Breakdown Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skattefordeling</CardTitle>
            </CardHeader>
            <CardContent>
              <WealthBarChart
                data={taxBarData}
                height={280}
                primaryLabel="Skat"
              />
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

          <DataDebugToggle source="/api/tax (POST)" data={result} />
        </>
      )}
    </div>
  );
}
