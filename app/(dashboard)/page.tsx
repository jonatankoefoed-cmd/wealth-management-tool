"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, PiggyBank, Wallet, Landmark, Sigma } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLoading } from "@/components/shared/section-loading";
import { StatusChip } from "@/components/shared/status-chip";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { Icon } from "@/components/ui/icon";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";

interface OverviewResponse {
  netWorth: number;
  cashValue: number;
  portfolioValue: number;
  debtValue: number;
  holdingsWarnings: string[];
  latestImportJob: {
    sourceFile: string;
    importedAt: string;
    status: string;
  } | null;
  latestMonthlyExecution: {
    status: string;
    targetMonth: string | null;
    scheduledDate: string;
    plan: {
      name: string | null;
    };
  } | null;
  status: {
    imports: string;
    monthlySavings: string;
  };
  audits: {
    netWorth: ExplainAudit;
    holdings: ExplainAudit | null;
    debt: ExplainAudit | null;
  };
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: typeof Wallet;
  audit: ExplainAudit;
}

function MetricCard({ label, value, icon, audit }: MetricCardProps): JSX.Element {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-text2">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-surface">
            <Icon icon={icon} size={18} color="secondary" />
          </span>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-brand-text1">{formatDKK(value)}</p>
        <div className="mt-2">
          <ExplainDrawer audit={audit} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage(): JSX.Element {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchJson<OverviewResponse>("/api/overview")
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setData(payload);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load overview");
      })
      .finally(() => {
        if (!mounted) {
          return;
        }
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const debtAudit = useMemo<ExplainAudit>(() => {
    if (!data?.audits.debt) {
      return {
        title: "Debt summary",
        steps: [
          {
            label: "Debt",
            formula: "No computed debt rows available",
            value: data?.debtValue ?? 0,
            unit: "DKK",
          },
        ],
        notes: ["No debt schedule rows found in current dataset."],
      };
    }
    return data.audits.debt;
  }, [data]);

  if (loading) {
    return <SectionLoading />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">{error ?? "Unable to load overview"}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Net Worth" value={data.netWorth} icon={Sigma} audit={data.audits.netWorth} />
        <MetricCard label="Cash" value={data.cashValue} icon={Wallet} audit={data.audits.netWorth} />
        <MetricCard
          label="Portfolio"
          value={data.portfolioValue}
          icon={PiggyBank}
          audit={data.audits.holdings ?? data.audits.netWorth}
        />
        <MetricCard label="Debt" value={data.debtValue} icon={Landmark} audit={debtAudit} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest Import Job</CardTitle>
            <CardDescription>Most recent data ingestion status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text2">Status</p>
              <StatusChip status={data.status.imports} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text2">Source file</p>
              <p className="max-w-[60%] truncate text-right text-sm text-brand-text1">
                {data.latestImportJob?.sourceFile ?? "No import found"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text2">Imported at</p>
              <p className="text-sm tabular-nums text-brand-text1">
                {data.latestImportJob
                  ? new Date(data.latestImportJob.importedAt).toLocaleString("da-DK")
                  : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Monthly Savings Run</CardTitle>
            <CardDescription>Execution engine health and target month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text2">Status</p>
              <StatusChip status={data.status.monthlySavings} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text2">Plan</p>
              <p className="text-sm text-brand-text1">
                {data.latestMonthlyExecution?.plan.name ?? "No execution found"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-text2">Target month</p>
              <p className="text-sm tabular-nums text-brand-text1">
                {data.latestMonthlyExecution?.targetMonth ?? "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Audit & Data Notes</CardTitle>
          <CardDescription>Warnings surfaced by backend computations</CardDescription>
        </CardHeader>
        <CardContent>
          {data.holdingsWarnings.length === 0 ? (
            <p className="text-sm text-brand-text2">No warnings in current snapshot.</p>
          ) : (
            <ul className="space-y-2 text-sm text-brand-text2">
              {data.holdingsWarnings.map((warning) => (
                <li key={warning} className="flex items-start gap-2">
                  <Icon icon={Database} size={16} color="warning" className="mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
