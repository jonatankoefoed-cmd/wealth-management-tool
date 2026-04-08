"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLoading } from "@/components/shared/section-loading";
import { StatusChip } from "@/components/shared/status-chip";
import { EmptyState } from "@/components/shared/empty-state";
import { DonutChart, type DonutChartDataPoint } from "@/components/charts/donut-chart";
import { WealthBarChart, type BarChartDataPoint } from "@/components/charts/bar-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";
import { DataDebugToggle } from "@/components/debug/data-debug-toggle";
import { PiggyBank, Calendar, TrendingUp, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ALLOCATION_PALETTE } from "@/components/charts/chart-theme";

interface AllocationItem {
  instrumentId: string;
  ticker: string;
  name: string;
  percentage: number;
}

interface ExecutionRun {
  id: string;
  status: string;
  targetMonth: string | null;
  scheduledDate: string;
  executedAt: string | null;
  totalAmount: number;
}

interface MonthlySavingsResponse {
  plan: {
    id: string;
    name: string;
    monthlyAmount: number;
    dayOfMonth: number;
    enabled: boolean;
    allocation: AllocationItem[];
  } | null;
  executions: ExecutionRun[];
  nextExecution: {
    scheduledDate: string;
    amount: number;
  } | null;
}

export default function MonthlySavingsPage() {
  const [data, setData] = useState<MonthlySavingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try {
      const payload = await fetchJson<MonthlySavingsResponse>("/api/monthly-savings");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente månedsopsparing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert allocation to chart data
  const allocationChartData = useMemo<DonutChartDataPoint[]>(() => {
    if (!data?.plan?.allocation) return [];
    return data.plan.allocation.map((item, index) => ({
      name: item.ticker || item.name,
      value: item.percentage,
      color: ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length],
    }));
  }, [data]);

  // Execution history chart data
  const executionChartData = useMemo<BarChartDataPoint[]>(() => {
    if (!data?.executions) return [];
    return data.executions
      .filter((exec) => exec.status === "COMPLETED")
      .slice(0, 6)
      .reverse()
      .map((exec) => ({
        label: exec.targetMonth?.slice(5) ?? exec.scheduledDate.slice(5, 7),
        value: exec.totalAmount,
      }));
  }, [data]);

  // Calculate totals
  const totalInvested = useMemo(() => {
    if (!data?.executions) return 0;
    return data.executions
      .filter((exec) => exec.status === "COMPLETED")
      .reduce((sum, exec) => sum + exec.totalAmount, 0);
  }, [data]);

  const completedExecutions = useMemo(() => {
    return (data?.executions || []).filter((exec) => exec.status === "COMPLETED").length;
  }, [data]);

  const formatDate = (dateStr: string) => {
    if (!mounted) return "";
    return new Date(dateStr).toLocaleDateString("da-DK");
  };

  if (!mounted) return <SectionLoading />;
  if (loading) return <SectionLoading />;

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">
          {error ?? "Kunne ikke indlæse månedsopsparing"}
        </CardContent>
      </Card>
    );
  }

  if (!data.plan) {
    return (
      <EmptyState
        title="Ingen opsparingsplan fundet"
        description="Du har ikke oprettet en månedsopsparingsplan endnu."
        icon={PiggyBank}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Månedligt beløb"
          value={formatDKK(data.plan.monthlyAmount)}
          icon={PiggyBank}
          size="large"
        />
        <KpiCard
          title="Investeret i alt"
          value={formatDKK(totalInvested)}
          icon={TrendingUp}
        />
        <KpiCard
          title="Gennemførte kørsler"
          value={completedExecutions.toString()}
          icon={CheckCircle}
        />
        <KpiCard
          title="Næste kørsel"
          value={data.nextExecution ? formatDate(data.nextExecution.scheduledDate) : "-"}
          icon={Calendar}
        />
      </section>

      {/* Main Charts */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* Allocation Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investeringsfordeling</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={allocationChartData}
              height={280}
              innerRadius={55}
              outerRadius={85}
              showLegend={true}
              centerValue={`${data.plan.allocation?.length ?? 0}`}
              centerLabel="Instrumenter"
              valueUnit="%"
            />
          </CardContent>
        </Card>

        {/* Execution History Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kørselshistorik</CardTitle>
          </CardHeader>
          <CardContent>
            {executionChartData.length > 0 ? (
              <WealthBarChart
                data={executionChartData}
                height={280}
                primaryLabel="Investeret"
              />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-brand-text3">
                Ingen kørsler gennemført endnu
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Plan Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{data.plan.name}</CardTitle>
            <StatusChip status={data.plan.enabled ? "SUCCESS" : "WARNING"} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-brand-text3">Månedligt beløb</p>
              <p className="mt-1 font-semibold tabular-nums text-brand-text1">
                {formatDKK(data.plan.monthlyAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-brand-text3">Dag i måneden</p>
              <p className="mt-1 font-semibold text-brand-text1">
                {data.plan.dayOfMonth}. dag
              </p>
            </div>
            <div>
              <p className="text-sm text-brand-text3">Status</p>
              <p className="mt-1 font-semibold text-brand-text1">
                {data.plan.enabled ? "Aktiv" : "Inaktiv"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allokeringsplan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data.plan.allocation || []).map((item, index) => (
              <div key={item.instrumentId} className="flex items-center justify-between border-b border-brand-border/50 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length] }}
                  />
                  <div>
                    <p className="font-medium text-brand-text1">{item.ticker}</p>
                    <p className="text-xs text-brand-text3">{item.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-brand-text1">
                    {item.percentage.toFixed(0)}%
                  </p>
                  <p className="text-xs tabular-nums text-brand-text3">
                    {formatDKK(data.plan!.monthlyAmount * (item.percentage / 100))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Execution History (Collapsible) */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Kørselshistorik</CardTitle>
            {showHistory ? (
              <ChevronUp className="h-5 w-5 text-brand-text3" />
            ) : (
              <ChevronDown className="h-5 w-5 text-brand-text3" />
            )}
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="py-2 text-left font-medium text-brand-text2">Dato</th>
                  <th className="py-2 text-left font-medium text-brand-text2">Målmåned</th>
                  <th className="py-2 text-right font-medium text-brand-text2">Beløb</th>
                  <th className="py-2 text-right font-medium text-brand-text2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.executions || []).map((exec) => (
                  <tr key={exec.id} className="border-b border-brand-border/50">
                    <td className="py-2 tabular-nums text-brand-text1">
                      {exec.executedAt
                        ? formatDate(exec.executedAt)
                        : formatDate(exec.scheduledDate)}
                    </td>
                    <td className="py-2 text-brand-text2">{exec.targetMonth ?? "-"}</td>
                    <td className="py-2 text-right tabular-nums font-medium text-brand-text1">
                      {formatDKK(exec.totalAmount)}
                    </td>
                    <td className="py-2 text-right">
                      <StatusChip status={exec.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>

      <DataDebugToggle source="/api/monthly-savings" data={data} />
    </div>
  );
}
