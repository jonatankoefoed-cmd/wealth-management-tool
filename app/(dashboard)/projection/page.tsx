"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { Icon } from "@/components/ui/icon";
import { SectionLoading } from "@/components/shared/section-loading";
import { Table, TableShell, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";

interface ProjectionPoint {
  month: string;
  pnl: {
    net: number;
  };
  balanceSheet: {
    cash: number;
    homeValue: number;
    mortgageBalance: number;
    bankLoanBalance: number;
    netWorth: number;
  };
  audits: ExplainAudit[];
}

interface ProjectionResponse {
  input: {
    includeHousing: boolean;
  };
  result: {
    series: ProjectionPoint[];
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
    housingInput: unknown;
  };
}

interface ProjectionForm {
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
  housingInput: unknown;
}

export default function ProjectionPage(): JSX.Element {
  const [form, setForm] = useState<ProjectionForm | null>(null);
  const [result, setResult] = useState<ProjectionResponse["result"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<ProjectionPoint | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchJson<ProjectionDefaults>("/api/projection")
      .then((payload) => {
        if (!mounted) {
          return;
        }
        const defaults = payload.defaults;
        setForm(defaults);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load projection defaults");
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

  const series = useMemo(() => result?.series ?? [], [result]);

  if (loading) {
    return <SectionLoading />;
  }

  if (error || !form) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">{error ?? "Unable to load projection"}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>Projection Controls</CardTitle>
          <CardDescription>Monthly projection input with optional housing module</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-brand-text2">
              Start month
              <input
                type="month"
                className="mt-1 w-full"
                value={form.startMonth}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          startMonth: event.target.value,
                        }
                      : current,
                  )
                }
              />
            </label>
            <label className="text-sm text-brand-text2">
              Months
              <input
                type="number"
                min={1}
                max={120}
                className="mt-1 w-full"
                value={form.months}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          months: Number(event.target.value),
                        }
                      : current,
                  )
                }
              />
            </label>
            <label className="text-sm text-brand-text2">
              Starting cash
              <input
                type="number"
                className="mt-1 w-full"
                value={form.startingBalanceSheet.cash}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          startingBalanceSheet: {
                            ...current.startingBalanceSheet,
                            cash: Number(event.target.value),
                          },
                        }
                      : current,
                  )
                }
              />
            </label>
            <label className="text-sm text-brand-text2">
              Starting portfolio
              <input
                type="number"
                className="mt-1 w-full"
                value={form.startingBalanceSheet.portfolioValue}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          startingBalanceSheet: {
                            ...current.startingBalanceSheet,
                            portfolioValue: Number(event.target.value),
                          },
                        }
                      : current,
                  )
                }
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-brand-text2">
              Disposable income before housing
              <input
                type="number"
                className="mt-1 w-full"
                value={form.baseline.monthlyDisposableIncomeBeforeHousing}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          baseline: {
                            ...current.baseline,
                            monthlyDisposableIncomeBeforeHousing: Number(event.target.value),
                          },
                        }
                      : current,
                  )
                }
              />
            </label>
            <label className="text-sm text-brand-text2">
              Non-housing expenses
              <input
                type="number"
                className="mt-1 w-full"
                value={form.baseline.monthlyNonHousingExpenses}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          baseline: {
                            ...current.baseline,
                            monthlyNonHousingExpenses: Number(event.target.value),
                          },
                        }
                      : current,
                  )
                }
              />
            </label>
            <label className="flex items-center gap-2 rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text1">
              <input
                type="checkbox"
                checked={form.includeHousing}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          includeHousing: event.target.checked,
                        }
                      : current,
                  )
                }
              />
              Include housing module
            </label>
          </div>

          <Button
            variant="primary"
            disabled={running}
            onClick={async () => {
              try {
                setRunning(true);
                const response = await fetchJson<ProjectionResponse>("/api/projection", {
                  method: "POST",
                  body: JSON.stringify(form),
                });
                setResult(response.result);
                setError(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Projection failed");
              } finally {
                setRunning(false);
              }
            }}
          >
            Run Projection
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Series</CardTitle>
          <CardDescription>Table-first projection output with audited month details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result?.warnings.length ? (
            <div className="rounded-md border border-[#F8D8A0] bg-[#FEF6E7] px-3 py-2 text-sm text-[#7D5C1B]">
              {result.warnings.join(" ")}
            </div>
          ) : null}

          <TableShell className="shadow-none">
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>Month</TH>
                    <TH className="text-right">Net P&L</TH>
                    <TH className="text-right">Cash</TH>
                    <TH className="text-right">Home Value</TH>
                    <TH className="text-right">Mortgage</TH>
                    <TH className="text-right">Bank Loan</TH>
                    <TH className="text-right">Net Worth</TH>
                    <TH>Audit</TH>
                  </tr>
                </THead>
                <tbody>
                  {series.map((point) => (
                    <TR
                      key={point.month}
                      className="cursor-pointer"
                      onClick={() => setSelectedMonth(point)}
                    >
                      <TD className="tabular-nums">{point.month}</TD>
                      <TD className="text-right tabular-nums">{formatDKK(point.pnl.net)}</TD>
                      <TD className="text-right tabular-nums">{formatDKK(point.balanceSheet.cash)}</TD>
                      <TD className="text-right tabular-nums">{formatDKK(point.balanceSheet.homeValue)}</TD>
                      <TD className="text-right tabular-nums">{formatDKK(point.balanceSheet.mortgageBalance)}</TD>
                      <TD className="text-right tabular-nums">{formatDKK(point.balanceSheet.bankLoanBalance)}</TD>
                      <TD className="text-right tabular-nums font-semibold text-brand-text1">
                        {formatDKK(point.balanceSheet.netWorth)}
                      </TD>
                      <TD>
                        <ExplainDrawer
                          audit={
                            point.audits[0] ?? {
                              title: `Month ${point.month}`,
                              steps: [
                                {
                                  label: "Net worth",
                                  formula: "cash + assets - liabilities",
                                  value: point.balanceSheet.netWorth,
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

          {!series.length ? (
            <div className="rounded-md border border-brand-border bg-brand-surface p-6 text-center">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-brand-surface2">
                <Icon icon={LineChart} size={18} color="secondary" />
              </div>
              <p className="text-sm text-brand-text2">Run projection to generate monthly series.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Drawer
        open={Boolean(selectedMonth)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMonth(null);
          }
        }}
        title={selectedMonth ? `Month Detail: ${selectedMonth.month}` : "Month Detail"}
        description="Audit objects for selected month"
      >
        {selectedMonth ? (
          <div className="space-y-3">
            <div className="rounded-md border border-brand-border bg-brand-surface p-3 text-sm">
              <p className="text-brand-text2">Net worth</p>
              <p className="text-lg font-semibold tabular-nums text-brand-text1">
                {formatDKK(selectedMonth.balanceSheet.netWorth)}
              </p>
            </div>
            {selectedMonth.audits.length > 0 ? (
              selectedMonth.audits.map((audit, index) => (
                <div key={`${audit.title}-${index}`} className="rounded-md border border-brand-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-brand-text1">{audit.title}</p>
                    <ExplainDrawer audit={audit} label="Open" />
                  </div>
                  <p className="text-xs text-brand-text2">Steps: {audit.steps?.length ?? 0}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-brand-text2">No audits available for this month.</p>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
