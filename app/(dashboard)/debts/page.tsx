"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Landmark } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { Icon } from "@/components/ui/icon";
import { SectionLoading } from "@/components/shared/section-loading";
import { Table, TableShell, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDKK, formatPercent } from "@/lib/format";
import { fetchJson } from "@/lib/client";

interface DebtRow {
  month: string;
  openingBalance: string;
  disbursement: string;
  interest: string;
  repayment: string;
  adjustment: string;
  closingBalance: string;
}

interface DebtSchedule {
  debtAccountId: string;
  debtAccountName: string;
  annualRate: string;
  rows: DebtRow[];
  audits: ExplainAudit[];
}

interface DebtPosting {
  id: string;
  date: string;
  type: string;
  amount: string;
  note: string | null;
  importJobId: string | null;
}

interface DebtAccount {
  id: string;
  name: string;
  kind: string;
  annualRate: string;
  plan: {
    amountPerMonth: string;
    dayOfMonth: number;
    status: string;
  } | null;
  postings: DebtPosting[];
}

interface DebtResponse {
  schedules: DebtSchedule[];
  debtAccounts: DebtAccount[];
  warnings: string[];
}

function postingSource(posting: DebtPosting): string {
  if (posting.importJobId) {
    return "IMPORTED";
  }
  return "SEEDED";
}

export default function DebtsPage(): JSX.Element {
  const [data, setData] = useState<DebtResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchJson<DebtResponse>("/api/debts")
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
        setError(err instanceof Error ? err.message : "Failed to load debt data");
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

  const primarySchedule = useMemo(() => {
    if (!data || data.schedules.length === 0) {
      return null;
    }
    return data.schedules[0];
  }, [data]);

  if (loading) {
    return <SectionLoading />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">{error ?? "Unable to load debts"}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="border-[#F8D8A0] bg-[#FEF6E7]">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-[#7D5C1B]">
          <Icon icon={AlertTriangle} size={18} color="warning" className="mt-0.5" />
          <div>
            {data.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.debtAccounts.map((account) => {
          const latestPosting = account.postings[0];
          return (
            <Card key={account.id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand-text1">{account.name}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-surface">
                    <Icon icon={Landmark} size={18} color="secondary" />
                  </span>
                </div>
                <div className="space-y-1 text-sm text-brand-text2">
                  <p>Kind: {account.kind}</p>
                  <p>Annual rate: {formatPercent(Number(account.annualRate) * 100, 2)}</p>
                  <p>
                    Plan: {account.plan ? `${formatDKK(account.plan.amountPerMonth)} monthly` : "No active plan"}
                  </p>
                  <p>
                    Latest posting: {latestPosting ? new Date(latestPosting.date).toLocaleDateString("da-DK") : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {primarySchedule ? (
        <Card>
          <CardHeader>
            <CardTitle>Debt Timeline ({primarySchedule.debtAccountName})</CardTitle>
            <CardDescription>Computed schedule from recorded postings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <TableShell className="shadow-none">
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Month</TH>
                      <TH className="text-right">Opening</TH>
                      <TH className="text-right">Disbursement</TH>
                      <TH className="text-right">Interest</TH>
                      <TH className="text-right">Repayment</TH>
                      <TH className="text-right">Closing</TH>
                      <TH>Explain</TH>
                    </tr>
                  </THead>
                  <tbody>
                    {primarySchedule.rows.map((row, index) => (
                      <TR key={`${row.month}-${index}`}>
                        <TD className="tabular-nums">{row.month}</TD>
                        <TD className="text-right tabular-nums">{formatDKK(row.openingBalance)}</TD>
                        <TD className="text-right tabular-nums">{formatDKK(row.disbursement)}</TD>
                        <TD className="text-right tabular-nums">{formatDKK(row.interest)}</TD>
                        <TD className="text-right tabular-nums">{formatDKK(row.repayment)}</TD>
                        <TD className="text-right tabular-nums">{formatDKK(row.closingBalance)}</TD>
                        <TD>
                          <ExplainDrawer
                            audit={
                              primarySchedule.audits[index] ?? {
                                title: `Debt month ${row.month}`,
                                steps: [
                                  {
                                    label: "closingBalance",
                                    formula: "opening + disbursement + interest + repayment + adjustment",
                                    value: row.closingBalance,
                                    unit: "DKK",
                                  },
                                ],
                              }
                            }
                          />
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </TableShell>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Postings Ledger</CardTitle>
          <CardDescription>Seeded vs imported postings, auditable by row</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.debtAccounts.flatMap((account) =>
            account.postings.slice(0, 12).map((posting) => (
              <div
                key={posting.id}
                className="grid gap-2 rounded-md border border-brand-border bg-brand-surface p-3 md:grid-cols-[140px_110px_1fr_120px]"
              >
                <p className="text-sm tabular-nums text-brand-text2">
                  {new Date(posting.date).toLocaleDateString("da-DK")}
                </p>
                <p className="text-sm font-medium text-brand-text1">{posting.type}</p>
                <p className="text-sm text-brand-text2">{posting.note ?? "No note"}</p>
                <div className="text-right">
                  <p className="text-sm tabular-nums text-brand-text1">{formatDKK(posting.amount)}</p>
                  <p className="text-[11px] uppercase tracking-wide text-brand-text3">{postingSource(posting)}</p>
                </div>
              </div>
            )),
          )}
        </CardContent>
      </Card>
    </div>
  );
}
