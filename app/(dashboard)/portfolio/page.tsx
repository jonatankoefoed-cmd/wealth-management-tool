"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BriefcaseBusiness, Calendar, Layers3, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DonutChart, type DonutChartDataPoint } from "@/components/charts/donut-chart";
import { HorizontalBarChart, type HorizontalBarDataPoint } from "@/components/charts/horizontal-bar-chart";
import { WealthAreaChart } from "@/components/charts/area-chart";
import { Table, TableBody, TableShell, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionLoading } from "@/components/shared/section-loading";
import { fetchJson } from "@/lib/client";
import { formatDKK } from "@/lib/format";
import { ALLOCATION_PALETTE } from "@/components/charts/chart-theme";
import { PriceRefresher } from "@/components/holdings/price-refresher";
import { InstrumentLogo } from "@/components/holdings/instrument-logo";
import { cn } from "@/lib/cn";

interface Position {
  instrumentId: string;
  name: string;
  ticker: string | null;
  quantity: number;
  avgCost: number;
  assetType?: string;
  priceDate: string | null;
  valueDKK: number | null;
  missingPrice: boolean;
}

interface Bucket {
  bucketKey: string;
  bucketLabel: string;
  valueDKK: number;
  positions: Position[];
}

interface HoldingsResponse {
  asOfDate: string;
  totals: {
    portfolioValueDKK: number;
    cashDKK: number;
    totalDebtDKK: number;
    netWorthDKK: number;
  };
  buckets: Bucket[];
  status: {
    missingPrices: number;
    hasHoldings: boolean;
  };
}

interface ForecastResponse {
  summary: {
    projectedPortfolioValue: number;
    projectedNetWorth: number;
    monthlyInvestmentNow: number;
  };
  portfolioSeries: Array<{
    month: string;
    portfolioValue: number;
    contribution: number;
    growth: number;
  }>;
  netWorthSeries: Array<{
    month: string;
    netWorth: number;
  }>;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<HoldingsResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJson<HoldingsResponse>("/api/holdings"),
      fetchJson<ForecastResponse>("/api/forecast"),
    ])
      .then(([holdingsPayload, forecastPayload]) => {
        setHoldings(holdingsPayload);
        setForecast(forecastPayload);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Kunne ikke hente portefølje"));
  }, []);

  const allPositions = useMemo(() => holdings?.buckets.flatMap((bucket) => bucket.positions) ?? [], [holdings]);

  const allocationData = useMemo<DonutChartDataPoint[]>(() => {
    if (!allPositions.length) return [];

    const sorted = [...allPositions].sort((a, b) => (b.valueDKK ?? 0) - (a.valueDKK ?? 0));
    const mainPositions = sorted.slice(0, 10);
    const others = sorted.slice(10);

    const data: DonutChartDataPoint[] = mainPositions.map((p, i) => ({
      name: p.ticker || p.name,
      value: p.valueDKK ?? 0,
      color: ALLOCATION_PALETTE[i % ALLOCATION_PALETTE.length],
    }));

    if (others.length > 0) {
      const othersValue = others.reduce((sum, p) => sum + (p.valueDKK ?? 0), 0);
      data.push({
        name: "Others",
        value: othersValue,
        color: "#94a3b8", // Slate-400
      });
    }

    return data;
  }, [allPositions]);

  const topHoldings = useMemo<HorizontalBarDataPoint[]>(
    () =>
      [...allPositions]
        .sort((left, right) => (right.valueDKK ?? 0) - (left.valueDKK ?? 0))
        .slice(0, 5)
        .map((position, index) => ({
          name: position.ticker || position.name,
          value: position.valueDKK ?? 0,
          color: ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length],
        })),
    [allPositions],
  );

  const portfolioChart = useMemo(() => {
    if (!forecast) return [];
    return forecast.portfolioSeries
      .filter((_, index) => index % 6 === 0)
      .map((point) => ({
        label: point.month,
        value: point.portfolioValue,
        secondary: point.contribution,
      }));
  }, [forecast]);

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-brand-danger">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!holdings || !forecast) {
    return <SectionLoading />;
  }

  if (!holdings.status.hasHoldings) {
    return (
      <EmptyState
        title="Ingen beholdninger fundet"
        description="Importer holdings først eller læg dem ind i databasen, før porteføljeoverblikket giver mening."
        actionLabel="Åbn advanced assumptions"
        onAction={() => (window.location.href = "/input")}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden border-brand-border/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(250,248,239,0.96))] shadow-card">
          <CardContent className="space-y-5 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Portfolio and forecast</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-text1">
                  {formatDKK(holdings.totals.portfolioValueDKK)}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-text2">
                  Current composition, top positions and the forward portfolio path.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <PriceRefresher />
                <div className="rounded-full border border-brand-border bg-white px-3 py-1 text-[10px] font-medium text-brand-text3 uppercase tracking-wider">
                  <Calendar className="mr-1.5 inline h-3 w-3" />
                  As of {holdings.asOfDate}
                </div>
              </div>
            </div>
            <WealthAreaChart data={portfolioChart} height={280} showSecondary={true} />
          </CardContent>
        </Card>

        <Card className="border-brand-border/70 bg-brand-surface shadow-soft">
          <CardHeader>
            <CardTitle>Forecast snapshot</CardTitle>
            <CardDescription>Where today’s portfolio can go with the current monthly contribution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-brand-border bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Projected portfolio</p>
              <p className="mt-2 text-2xl font-semibold text-brand-text1">{formatDKK(forecast.summary.projectedPortfolioValue)}</p>
            </div>
            <div className="rounded-2xl border border-brand-border bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Projected net worth</p>
              <p className="mt-2 text-2xl font-semibold text-brand-text1">{formatDKK(forecast.summary.projectedNetWorth)}</p>
            </div>
            <div className="rounded-2xl border border-brand-border bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Monthly contribution</p>
              <p className="mt-2 text-2xl font-semibold text-brand-text1">{formatDKK(forecast.summary.monthlyInvestmentNow)}</p>
            </div>
            <Link href="/today/budget" className="inline-flex text-sm font-medium text-brand-text1 underline-offset-4 hover:underline">
              Tune assumptions in budget
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Market Value" value={formatDKK(holdings.totals.portfolioValueDKK)} icon={BriefcaseBusiness} />
        <KpiCard title="Cash" value={formatDKK(holdings.totals.cashDKK)} icon={Wallet} />
        <KpiCard title="Net Worth" value={formatDKK(holdings.totals.netWorthDKK)} icon={TrendingUp} />
        <KpiCard
          title="Pricing status"
          value={holdings.status.missingPrices > 0 ? `${holdings.status.missingPrices} missing` : "All priced"}
          icon={Layers3}
          status={holdings.status.missingPrices > 0 ? "WARNING" : "SUCCESS"}
          statusLabel={holdings.status.missingPrices > 0 ? "Check latest prices" : "Ready for forecast"}
        />
      </section>

      {holdings.buckets.map((bucket) => (
        <TableShell key={bucket.bucketKey}>
          <div className={cn(
            "flex items-center justify-between border-b border-brand-border px-5 py-4",
            bucket.bucketKey === "CRYPTO" && "bg-[linear-gradient(90deg,rgba(247,147,26,0.05),transparent)] border-l-4 border-l-[#F7931A]"
          )}>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-brand-text1">{bucket.bucketLabel}</h3>
                {bucket.bucketKey === "CRYPTO" && (
                  <span className="rounded-full bg-[#F7931A]/10 px-2 py-0.5 text-[10px] font-bold text-[#F7931A]">LIVE</span>
                )}
              </div>
              <p className="text-xs text-brand-text2">{formatDKK(bucket.valueDKK)}</p>
            </div>
          </div>
          <TableWrap>
            <Table>
              <THead>
                <TR className="border-b-0 hover:bg-transparent">
                  <TH className="py-5 pl-6">Position</TH>
                  <TH className="text-right">Value</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH className="text-right pr-6">Status</TH>
                </TR>
              </THead>
              <TableBody>
                {bucket.positions.map((position) => (
                  <TR key={position.instrumentId} className="group border-b border-brand-border/40 last:border-0 hover:bg-brand-surface/40 transition-all duration-300">
                    <TD className="py-4 pl-6">
                      <div className="flex items-center gap-4">
                        <InstrumentLogo 
                          ticker={position.ticker} 
                          name={position.name} 
                          assetType={position.assetType}
                          className="hover:scale-105 transition-transform"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-brand-text1 text-sm tracking-tight">{position.name}</span>
                          <span className="font-mono text-[10px] text-brand-text3 uppercase tracking-wider">{position.ticker || "N/A"}</span>
                        </div>
                        {bucket.bucketKey === "CRYPTO" && (
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        )}
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-brand-text1">{formatDKK(position.valueDKK ?? 0)}</span>
                        <span className="text-[10px] text-brand-text3">Value DKK</span>
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums text-xs">
                      <div className="flex flex-col items-end">
                        <span className="text-brand-text2 font-medium">{formatDKK(position.avgCost)}</span>
                        <span className="text-[9px] text-brand-text3 uppercase tracking-tighter">Avg Cost</span>
                      </div>
                    </TD>
                    <TD className="text-right tabular-nums text-sm">
                      <div className="flex flex-col items-end">
                        <span className="text-brand-text1 font-medium">{position.quantity.toLocaleString("da-DK", { maximumFractionDigits: 8 })}</span>
                        <span className="text-[9px] text-brand-text3 uppercase tracking-tighter">Units</span>
                      </div>
                    </TD>
                    <TD className="text-right pr-6">
                      {bucket.bucketKey === "CRYPTO" ? (
                        <div className="flex flex-col items-end">
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600 shadow-sm border border-green-100">Live</span>
                          <span className="text-[9px] text-brand-text3 mt-0.5">Binance</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-[10px] font-medium",
                            position.missingPrice ? "text-amber-600" : "text-brand-text2"
                          )}>
                            {position.missingPrice ? "Manual" : (position.priceDate || "Today")}
                          </span>
                          <span className="text-[9px] text-brand-text3 uppercase tracking-tighter mt-0.5">Price Date</span>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        </TableShell>
      ))}
    </div>
  );
}
