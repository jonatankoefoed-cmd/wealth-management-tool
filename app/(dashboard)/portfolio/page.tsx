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

interface Position {
  instrumentId: string;
  name: string;
  ticker: string | null;
  quantity: number;
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

export default function PortfolioPage(): JSX.Element {
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

  const allocationData = useMemo<DonutChartDataPoint[]>(
    () =>
      allPositions
        .filter((position) => (position.valueDKK ?? 0) > 0)
        .map((position, index) => ({
          name: position.ticker || position.name,
          value: position.valueDKK ?? 0,
          color: ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length],
        })),
    [allPositions],
  );

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
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-text3">Portfolio and forecast</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-text1">
                  {formatDKK(holdings.totals.portfolioValueDKK)}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-text2">
                  Current composition, top positions and the forward portfolio path under the same assumptions as the budget workspace.
                </p>
              </div>
              <div className="rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-medium text-brand-text2">
                <Calendar className="mr-2 inline h-3.5 w-3.5" />
                {holdings.asOfDate}
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

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Allocation today</CardTitle>
            <CardDescription>Weighted by current DKK market value.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={allocationData}
              height={300}
              innerRadius={60}
              outerRadius={88}
              centerValue={formatDKK(holdings.totals.portfolioValueDKK)}
              centerLabel="Portfolio"
              showLegend={true}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Largest positions</CardTitle>
            <CardDescription>Your biggest concentration points right now.</CardDescription>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={topHoldings} height={300} />
          </CardContent>
        </Card>
      </section>

      {holdings.buckets.map((bucket) => (
        <TableShell key={bucket.bucketKey}>
          <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-brand-text1">{bucket.bucketLabel}</h3>
              <p className="text-xs text-brand-text2">{formatDKK(bucket.valueDKK)}</p>
            </div>
          </div>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Position</TH>
                  <TH>Ticker</TH>
                  <TH className="text-right">Value</TH>
                  <TH className="text-right">Quantity</TH>
                  <TH className="text-right">Price status</TH>
                </TR>
              </THead>
              <TableBody>
                {bucket.positions.map((position) => (
                  <TR key={position.instrumentId}>
                    <TD>{position.name}</TD>
                    <TD>{position.ticker || "-"}</TD>
                    <TD className="text-right tabular-nums">{formatDKK(position.valueDKK ?? 0)}</TD>
                    <TD className="text-right tabular-nums">{position.quantity.toLocaleString("da-DK")}</TD>
                    <TD className="text-right text-xs text-brand-text2">
                      {position.missingPrice ? "Fallback price" : position.priceDate || "-"}
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
