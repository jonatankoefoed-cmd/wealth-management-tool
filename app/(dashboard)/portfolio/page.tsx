"use client";

import { useEffect, useState } from "react";
import { DownloadCloud, PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { SectionLoading } from "@/components/shared/section-loading";
import { StatusChip } from "@/components/shared/status-chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Table, TableShell, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDKK, formatQuantity } from "@/lib/format";
import { fetchJson } from "@/lib/client";

interface PortfolioRow {
  instrumentId: string;
  instrumentName: string;
  ticker: string | null;
  quantity: number;
  avgCost: number;
  latestPrice: number | null;
  priceSource: string;
  marketValue: number | null;
}

interface PortfolioResponse {
  rows: PortfolioRow[];
  empty: boolean;
  missingPrices: number;
  warnings: string[];
  audits: ExplainAudit[];
  importJobs: Array<{
    id: string;
    kind: string;
    status: string;
    sourceFile: string;
    importedAt: string;
    errorsJson: unknown;
  }>;
}

export default function PortfolioPage(): JSX.Element {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchJson<PortfolioResponse>("/api/portfolio")
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
        setError(err instanceof Error ? err.message : "Failed to load portfolio");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <SectionLoading />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">{error ?? "Unable to load portfolio"}</CardContent>
      </Card>
    );
  }

  if (data.empty) {
    return (
      <EmptyState
        title="No Holdings Imported"
        description="Import a holdings snapshot CSV to populate portfolio positions and enable audited market value tracking."
        icon={PackageSearch}
        illustration="/assets/illustrations/empty-import.svg"
        actionLabel="Import Holdings"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-brand-text2">Holdings</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-text1">{data.rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-brand-text2">Missing Prices</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-text1">{data.missingPrices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-brand-text2">Warnings</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-text1">{data.warnings.length}</p>
          </CardContent>
        </Card>
      </section>

      <TableShell>
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>Instrument</TH>
                <TH className="text-right">Quantity</TH>
                <TH className="text-right">Avg Cost</TH>
                <TH className="text-right">Market Price</TH>
                <TH className="text-right">Market Value</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {data.rows.map((row) => (
                <TR key={row.instrumentId}>
                  <TD>
                    <p className="font-medium text-brand-text1">{row.instrumentName}</p>
                    <p className="text-xs text-brand-text2">{row.ticker ?? "No ticker"}</p>
                  </TD>
                  <TD className="text-right tabular-nums">{formatQuantity(row.quantity)}</TD>
                  <TD className="text-right tabular-nums">{formatDKK(row.avgCost)}</TD>
                  <TD className="text-right tabular-nums">
                    {row.latestPrice === null ? "-" : formatDKK(row.latestPrice)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {row.marketValue === null ? "-" : formatDKK(row.marketValue)}
                  </TD>
                  <TD>
                    {row.latestPrice === null ? (
                      <span className="inline-flex items-center rounded-full border border-[#F8D8A0] bg-[#FEF6E7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-warning">
                        Missing price
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-[#B9E4C9] bg-[#E9F8EF] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-success">
                        {row.priceSource}
                      </span>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </TableShell>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import Status</CardTitle>
            <CardDescription>Latest import jobs and quality outcomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.importJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-md border border-brand-border bg-brand-surface p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-brand-text1">{job.kind}</p>
                  <StatusChip status={job.status} />
                </div>
                <p className="mt-1 text-brand-text2">{job.sourceFile}</p>
                <p className="mt-1 text-xs text-brand-text3">
                  {new Date(job.importedAt).toLocaleString("da-DK")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Explain Holdings</CardTitle>
            <CardDescription>Audit trail from holdings computation engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.audits.length > 0 ? (
              data.audits.slice(0, 3).map((audit, index) => (
                <div
                  key={`${audit.title}-${index}`}
                  className="flex items-center justify-between rounded-md border border-brand-border bg-brand-surface p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-text1">{audit.title}</p>
                    <p className="text-xs text-brand-text2">Derived from transaction events</p>
                  </div>
                  <ExplainDrawer audit={audit} />
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-sm text-brand-text2">
                <Icon icon={DownloadCloud} size={16} color="secondary" />
                No audit objects returned for current dataset.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
