"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SectionLoading } from "@/components/shared/section-loading";
import { WealthAreaChart } from "@/components/charts/area-chart";
import { fetchJson } from "@/lib/client";
import { formatDKK, formatPercent } from "@/lib/format";

interface OverviewResponse {
  asOfDate: string;
  snapshot: {
    portfolioValueDKK: number;
    cashDKK: number;
    totalDebtDKK: number;
    netWorthDKK: number;
  };
  summary: {
    currentNetWorth: number;
    projectedNetWorth: number;
    projectedPortfolioValue: number;
    monthlyDisposableNow: number;
    monthlyResidualNow: number;
    monthlyInvestmentNow: number;
    portfolioSharePct: number;
    liquiditySharePct: number;
    debtSharePct: number;
    homeValue: number;
  };
  scenarioMeta: {
    advanced: {
      housingEnabled: boolean;
      debtEnabled: boolean;
      eventsCount: number;
    };
  };
}

interface ForecastResponse {
  netWorthSeries: Array<{
    month: string;
    netWorth: number;
    cash: number;
    portfolioValue: number;
  }>;
  portfolioSeries: Array<{
    month: string;
    portfolioValue: number;
    contribution: number;
  }>;
}

export default function OverviewPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<OverviewResponse>("/api/overview"),
      fetchJson<ForecastResponse>("/api/forecast"),
    ])
      .then(([overviewPayload, forecastPayload]) => {
        setOverview(overviewPayload);
        setForecast(forecastPayload);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Kunne ikke indlæse overview"));
  }, []);

  const chartData = useMemo(() => {
    if (!forecast) return [];
    return forecast.netWorthSeries
      .filter((_, index) => index % 6 === 0)
      .map((point) => ({
        label: point.month.slice(0, 7),
        value: point.netWorth,
        secondary: point.portfolioValue,
      }));
  }, [forecast]);

  if (error) {
    return <div className="rounded-xl border border-brand-danger/20 bg-white p-6 text-sm text-brand-danger">{error}</div>;
  }

  if (!overview || !forecast) {
    return <SectionLoading />;
  }

  const growthPct =
    overview.summary.currentNetWorth > 0
      ? (overview.summary.projectedNetWorth - overview.summary.currentNetWorth) / overview.summary.currentNetWorth
      : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
        <Card className="overflow-hidden border-brand-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(250,248,239,0.98))] shadow-card">
          <CardContent className="grid gap-8 p-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent/20 bg-brand-accent/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text2">
                <Sparkles className="h-3.5 w-3.5 text-brand-accent" />
                Wealth Tool v1
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-brand-text2">Live monthly budget, investable surplus and forward wealth path.</p>
                <h2 className="max-w-xl text-4xl font-semibold tracking-tight text-brand-text1">
                  {formatDKK(overview.summary.currentNetWorth)}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-brand-text2">
                  Forecast points to <span className="font-semibold text-brand-text1">{formatDKK(overview.summary.projectedNetWorth)}</span> over the next 10 years,
                  driven by a monthly investable amount of <span className="font-semibold text-brand-text1">{formatDKK(overview.summary.monthlyInvestmentNow)}</span>.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/today/budget">
                  <Button className="gap-2 rounded-full bg-brand-text1 px-5 text-brand-textInvert hover:bg-brand-text1/90">
                    Open Budget
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/portfolio">
                  <Button variant="ghost" className="gap-2 rounded-full border border-brand-border bg-brand-surface2 px-5 text-brand-text2 hover:bg-brand-surface">
                    Portfolio & Forecast
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-border/70 bg-white/80 p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Net Worth Path</p>
                  <p className="text-sm font-medium text-brand-text2">Net worth with portfolio as overlay</p>
                </div>
                <div className="rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand-text2">
                  {formatPercent(growthPct, 0)} uplift
                </div>
              </div>
              <WealthAreaChart data={chartData} height={270} showSecondary={true} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-border/70 bg-brand-surface shadow-soft">
          <CardHeader>
            <CardTitle>Composition Today</CardTitle>
            <CardDescription>What is driving your balance sheet right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-brand-border bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Portfolio share</p>
              <p className="mt-2 text-2xl font-semibold text-brand-text1">{formatPercent(overview.summary.portfolioSharePct, 0)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-brand-border bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Cash liquidity</p>
                <p className="mt-2 text-lg font-semibold text-brand-text1">{formatDKK(overview.snapshot.cashDKK)}</p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Total debt</p>
                <p className="mt-2 text-lg font-semibold text-brand-text1">{formatDKK(overview.snapshot.totalDebtDKK)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-brand-border bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Advanced assumptions active</p>
              <p className="mt-2 text-sm leading-6 text-brand-text2">
                {overview.scenarioMeta.advanced.housingEnabled ? "Housing" : "No housing"},
                {" "}
                {overview.scenarioMeta.advanced.debtEnabled ? "debt" : "no debt"}
                {" "}
                og {overview.scenarioMeta.advanced.eventsCount} events.
              </p>
              <Link href="/input" className="mt-3 inline-flex text-sm font-medium text-brand-text1 underline-offset-4 hover:underline">
                Review advanced assumptions
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Monthly Disposable"
          value={formatDKK(overview.summary.monthlyDisposableNow)}
          icon={Wallet}
          sparklineData={forecast.netWorthSeries.map((point) => point.cash)}
        />
        <KpiCard
          title="Monthly Investable"
          value={formatDKK(overview.summary.monthlyInvestmentNow)}
          icon={ReceiptText}
          sparklineData={forecast.portfolioSeries.map((point) => point.contribution)}
        />
        <KpiCard
          title="Projected Portfolio"
          value={formatDKK(overview.summary.projectedPortfolioValue)}
          icon={BriefcaseBusiness}
          sparklineData={forecast.portfolioSeries.map((point) => point.portfolioValue)}
        />
        <KpiCard
          title="Residual Cash Flow"
          value={formatDKK(overview.summary.monthlyResidualNow)}
          icon={TrendingUp}
          sparklineData={forecast.netWorthSeries.map((point) => point.netWorth)}
          status={overview.summary.monthlyResidualNow >= 0 ? "SUCCESS" : "WARNING"}
          statusLabel={overview.summary.monthlyResidualNow >= 0 ? "Positive run-rate" : "Tight budget"}
        />
      </section>
    </div>
  );
}
