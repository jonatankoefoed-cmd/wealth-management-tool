"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLoading } from "@/components/shared/section-loading";
import { EmptyState } from "@/components/shared/empty-state";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { WealthAreaChart, type AreaChartDataPoint } from "@/components/charts/area-chart";
import { WealthBarChart, type BarChartDataPoint } from "@/components/charts/bar-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";
import { DataDebugToggle } from "@/components/debug/data-debug-toggle";
import { Landmark, Calendar, TrendingDown, Percent, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

interface DebtRow {
  month: string;
  openingBalance: number;
  disbursement: number;
  interest: number;
  repayment: number;
  closingBalance: number;
  audit?: ExplainAudit;
}

interface DebtSchedule {
  accountId: string;
  accountName: string;
  debtType: string;
  interestRate: number;
  repaymentPlan: string;
  rows: DebtRow[];
  audits: ExplainAudit[];
}

interface DebtResponse {
  schedules: DebtSchedule[];
  warnings: string[];
  postings: Array<{
    id: string;
    date: string;
    amount: number;
    memo: string;
  }>;
}

export default function DebtsPage() {
  const [data, setData] = useState<DebtResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchJson<DebtResponse>("/api/debts")
      .then((payload) => {
        if (!mounted) return;
        setData(payload);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Kunne ikke hente gældsdata");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Get primary schedule (first one)
  const primarySchedule = data?.schedules[0];

  // Convert to chart data
  const balanceChartData = useMemo<AreaChartDataPoint[]>(() => {
    if (!primarySchedule) return [];
    return primarySchedule.rows.map((row) => ({
      label: row.month.slice(5),
      value: row.closingBalance,
    }));
  }, [primarySchedule]);

  const interestVsPrincipalData = useMemo<BarChartDataPoint[]>(() => {
    if (!primarySchedule) return [];
    return primarySchedule.rows.slice(0, 12).map((row) => ({
      label: row.month.slice(5),
      value: row.repayment,
      secondary: row.interest,
    }));
  }, [primarySchedule]);

  // Calculate totals
  const currentBalance = primarySchedule?.rows[primarySchedule.rows.length - 1]?.closingBalance ?? 0;
  const totalInterest = primarySchedule?.rows.reduce((sum, row) => sum + row.interest, 0) ?? 0;
  const totalRepayment = primarySchedule?.rows.reduce((sum, row) => sum + row.repayment, 0) ?? 0;
  const remainingMonths = primarySchedule?.rows.filter((row) => row.closingBalance > 0).length ?? 0;

  if (loading) {
    return <SectionLoading />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">
          {error ?? "Kunne ikke indlæse gældsdata"}
        </CardContent>
      </Card>
    );
  }

  if (data.schedules.length === 0) {
    return (
      <EmptyState
        title="Ingen gæld fundet"
        description="Der blev ikke fundet nogen gældskonti i dine data."
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Nuværende gæld"
          value={formatDKK(currentBalance)}
          icon={Landmark}
          size="large"
        />
        <KpiCard
          title="Resterende måneder"
          value={remainingMonths.toString()}
          icon={Calendar}
        />
        <KpiCard
          title="Samlet rente"
          value={formatDKK(totalInterest)}
          icon={Percent}
        />
        <KpiCard
          title="Samlet afdrag"
          value={formatDKK(totalRepayment)}
          icon={TrendingDown}
        />
      </section>

      {/* Debt Balance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gældsudvikling</CardTitle>
        </CardHeader>
        <CardContent>
          <WealthAreaChart
            data={balanceChartData}
            height={300}
            gradientId="debtGradient"
          />
        </CardContent>
      </Card>

      {/* Interest vs Principal Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Afdrag vs. rente (første 12 mdr.)</CardTitle>
        </CardHeader>
        <CardContent>
          <WealthBarChart
            data={interestVsPrincipalData}
            height={260}
            showSecondary={true}
            stacked={true}
            primaryLabel="Afdrag"
            secondaryLabel="Rente"
          />
        </CardContent>
      </Card>

      {/* Account Cards */}
      {data.schedules.map((schedule) => (
        <Card key={schedule.accountId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{schedule.accountName}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-brand-text2">
                <span>Rente: {schedule.interestRate ? (schedule.interestRate * 100).toFixed(2) : "0.00"}%</span>
                <span>{schedule.repaymentPlan}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ExplainDrawer audit={schedule.audits[0]} />
          </CardContent>
        </Card>
      ))}

      {/* Detailed Table (Collapsible) */}
      {primarySchedule && (
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowDetails(!showDetails)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Detaljeret afdragsplan</CardTitle>
              {showDetails ? (
                <ChevronUp className="h-5 w-5 text-brand-text3" />
              ) : (
                <ChevronDown className="h-5 w-5 text-brand-text3" />
              )}
            </div>
          </CardHeader>
          {showDetails && (
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="py-2 text-left font-medium text-brand-text2">Måned</th>
                    <th className="py-2 text-right font-medium text-brand-text2">Åbning</th>
                    <th className="py-2 text-right font-medium text-brand-text2">Rente</th>
                    <th className="py-2 text-right font-medium text-brand-text2">Afdrag</th>
                    <th className="py-2 text-right font-medium text-brand-text2">Lukning</th>
                  </tr>
                </thead>
                <tbody>
                  {primarySchedule.rows.map((row) => (
                    <tr key={row.month} className="border-b border-brand-border/50">
                      <td className="py-2 font-medium text-brand-text1">{row.month}</td>
                      <td className="py-2 text-right tabular-nums">{formatDKK(row.openingBalance)}</td>
                      <td className="py-2 text-right tabular-nums text-brand-warning">
                        {formatDKK(row.interest)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-brand-success">
                        {formatDKK(row.repayment)}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {formatDKK(row.closingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          )}
        </Card>
      )}

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <Card className="border-brand-warning/30 bg-brand-warning/5">
          <CardHeader>
            <CardTitle className="text-base">Advarsler</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-brand-text2">
              {data.warnings.map((warning) => (
                <li key={warning} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-warning" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <DataDebugToggle source="/api/debts" data={data} />
    </div>
  );
}
