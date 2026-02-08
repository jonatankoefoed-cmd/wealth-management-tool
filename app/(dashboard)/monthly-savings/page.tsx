"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CircleAlert, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { Icon } from "@/components/ui/icon";
import { SectionLoading } from "@/components/shared/section-loading";
import { StatusChip } from "@/components/shared/status-chip";
import { Table, TableShell, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDKK, formatNumber, formatPercent } from "@/lib/format";
import { fetchJson } from "@/lib/client";

interface InstrumentRef {
  name: string;
  ticker: string | null;
}

interface PlanLine {
  id: string;
  instrumentId: string;
  weightPct: string | number;
  sortOrder: number;
  instrument: InstrumentRef;
}

interface RecurringPlan {
  id: string;
  name: string | null;
  amountDkk: string | number;
  dayOfMonth: number;
  status: "ACTIVE" | "PAUSED";
  lines: PlanLine[];
}

interface ExecutionLine {
  id: string;
  instrumentId: string;
  weightPct: string | number;
  targetAmount: string | number;
  quotePrice: string | number | null;
  quantity: string | number | null;
  status: string;
  failureReason: string | null;
  manualPriceOverride: string | number | null;
  manualNote: string | null;
  instrument: InstrumentRef;
}

interface ExecutionRun {
  id: string;
  status: string;
  targetMonth: string | null;
  scheduledDate: string;
  executedAt: string | null;
  auditJson: ExplainAudit | null;
  lines: ExecutionLine[];
}

interface LineQuote {
  instrumentId: string;
  status: "OK" | "MISSING" | "ERROR";
  price: number | null;
  source: string;
  asOf: string;
  notes: string | null;
}

interface MonthlySavingsResponse {
  plan: RecurringPlan | null;
  runs: ExecutionRun[];
  lineQuotes: LineQuote[];
  currentTargetMonth: string;
  educationalPanel: {
    title: string;
    body: string;
  };
}

interface PlanDraft {
  amountDkk: number;
  dayOfMonth: number;
  lines: Array<{
    instrumentId: string;
    weightPct: number;
    sortOrder: number;
  }>;
}

function asNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

export default function MonthlySavingsPage(): JSX.Element {
  const [data, setData] = useState<MonthlySavingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [overrideLoadingId, setOverrideLoadingId] = useState<string | null>(null);
  const [overrideValues, setOverrideValues] = useState<Record<string, { price: string; note: string }>>({});
  const [draft, setDraft] = useState<PlanDraft | null>(null);

  async function load(): Promise<void> {
    try {
      const payload = await fetchJson<MonthlySavingsResponse>("/api/monthly-savings");
      setData(payload);
      if (payload.plan) {
        setDraft({
          amountDkk: asNumber(payload.plan.amountDkk),
          dayOfMonth: payload.plan.dayOfMonth,
          lines: payload.plan.lines.map((line) => ({
            instrumentId: line.instrumentId,
            weightPct: asNumber(line.weightPct),
            sortOrder: line.sortOrder,
          })),
        });
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monthly savings");
    }
  }

  useEffect(() => {
    let mounted = true;
    load()
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      })
      .catch(() => {
        // handled in load
      });

    return () => {
      mounted = false;
    };
  }, []);

  const latestRun = useMemo(() => {
    if (!data || data.runs.length === 0) {
      return null;
    }
    return data.runs[0];
  }, [data]);

  const totalWeight = useMemo(() => {
    if (!draft) {
      return 0;
    }
    return draft.lines.reduce((sum, line) => sum + line.weightPct, 0);
  }, [draft]);

  const selectedRunAudit = latestRun?.auditJson ?? {
    title: "Execution audit",
    notes: ["No auditJson found for this run."],
    steps: [],
  };

  if (loading) {
    return <SectionLoading />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">{error ?? "Unable to load monthly savings"}</CardContent>
      </Card>
    );
  }

  if (!data.plan || !draft) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-text2">No recurring investment plan found.</CardContent>
      </Card>
    );
  }

  const quoteByInstrument = new Map(data.lineQuotes.map((quote) => [quote.instrumentId, quote]));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Plan Configuration</CardTitle>
            <CardDescription>Editable inputs for monthly shadow execution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-brand-text2">
                Amount (DKK)
                <input
                  type="number"
                  value={draft.amountDkk}
                  className="mt-1 w-full"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            amountDkk: Number(event.target.value),
                          }
                        : current,
                    )
                  }
                />
              </label>
              <label className="text-sm text-brand-text2">
                Day of month
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={draft.dayOfMonth}
                  className="mt-1 w-full"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            dayOfMonth: Number(event.target.value),
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-brand-text1">Allocation lines</p>
              {data.plan.lines.map((line, index) => {
                const lineDraft = draft.lines[index];
                const quote = quoteByInstrument.get(line.instrumentId);

                return (
                  <div
                    key={line.id}
                    className="grid gap-3 rounded-md border border-brand-border bg-brand-surface p-3 md:grid-cols-[1fr_120px_130px]"
                  >
                    <div>
                      <p className="text-sm font-medium text-brand-text1">{line.instrument.name}</p>
                      <p className="text-xs text-brand-text2">{line.instrument.ticker ?? "No ticker"}</p>
                    </div>
                    <label className="text-sm text-brand-text2">
                      Weight %
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={lineDraft?.weightPct ?? 0}
                        className="mt-1 w-full"
                        onChange={(event) =>
                          setDraft((current) => {
                            if (!current) {
                              return current;
                            }
                            const nextLines = [...current.lines];
                            nextLines[index] = {
                              ...nextLines[index],
                              weightPct: Number(event.target.value),
                            };
                            return {
                              ...current,
                              lines: nextLines,
                            };
                          })
                        }
                      />
                    </label>
                    <div className="text-sm text-brand-text2">
                      <p>Price rule</p>
                      <p className="mt-1 text-xs">
                        {quote?.status === "OK"
                          ? `Using ${formatDKK(quote.price)} (${quote.source})`
                          : "Manual override required"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-border bg-brand-surface px-3 py-2">
              <p className="text-sm text-brand-text2">
                Total weight: <span className="font-medium tabular-nums text-brand-text1">{formatPercent(totalWeight, 2)}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={running}
                  onClick={async () => {
                    try {
                      setRunning(true);
                      await fetchJson<{ result: unknown }>("/api/monthly-savings/run", {
                        method: "POST",
                        body: JSON.stringify({
                          planId: data.plan?.id,
                          targetMonth: data.currentTargetMonth,
                          force: true,
                        }),
                      });
                      await load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Execution failed");
                    } finally {
                      setRunning(false);
                    }
                  }}
                >
                  Run {data.currentTargetMonth}
                </Button>
                <Button
                  variant="primary"
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await fetchJson<{ updated: unknown }>("/api/monthly-savings/plan", {
                        method: "PATCH",
                        body: JSON.stringify({
                          planId: data.plan?.id,
                          amountDkk: draft.amountDkk,
                          dayOfMonth: draft.dayOfMonth,
                          lines: draft.lines,
                        }),
                      });
                      await load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Save failed");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Save Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{data.educationalPanel.title}</CardTitle>
            <CardDescription>Educational note</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-brand-surface">
              <Icon icon={FlaskConical} size={18} color="accent" />
            </div>
            <p className="text-sm text-brand-text2">{data.educationalPanel.body}</p>
            <Image
              src="/assets/illustrations/empty-scenarios.svg"
              alt="Shadow execution concept"
              width={320}
              height={180}
              className="mt-4 w-full rounded-md border border-brand-border"
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>ExecutionRun records with auditable line outcomes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TableShell className="shadow-none">
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>Target Month</TH>
                    <TH>Status</TH>
                    <TH>Scheduled</TH>
                    <TH className="text-right">Lines</TH>
                    <TH>Audit</TH>
                  </tr>
                </THead>
                <tbody>
                  {data.runs.map((run) => (
                    <TR key={run.id}>
                      <TD className="tabular-nums">{run.targetMonth ?? "-"}</TD>
                      <TD>
                        <StatusChip status={run.status} />
                      </TD>
                      <TD className="tabular-nums text-brand-text2">
                        {new Date(run.scheduledDate).toLocaleDateString("da-DK")}
                      </TD>
                      <TD className="text-right tabular-nums">{run.lines.length}</TD>
                      <TD>
                        <ExplainDrawer audit={run.auditJson ?? selectedRunAudit} />
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </TableShell>

          {latestRun ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-text1">Latest run lines ({latestRun.targetMonth})</h3>
                <StatusChip status={latestRun.status} />
              </div>
              {latestRun.lines.map((line) => (
                <div
                  key={line.id}
                  className="rounded-md border border-brand-border bg-brand-surface p-3"
                >
                  <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_1fr]">
                    <div>
                      <p className="text-sm font-medium text-brand-text1">{line.instrument.name}</p>
                      <p className="text-xs text-brand-text2">{line.instrument.ticker ?? "No ticker"}</p>
                    </div>
                    <p className="text-sm tabular-nums text-brand-text2">
                      Target: <span className="text-brand-text1">{formatDKK(line.targetAmount)}</span>
                    </p>
                    <p className="text-sm tabular-nums text-brand-text2">
                      Quote: <span className="text-brand-text1">{line.quotePrice ? formatDKK(line.quotePrice) : "-"}</span>
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <StatusChip status={line.status} />
                        {line.failureReason ? (
                          <span className="text-xs text-brand-warning">{line.failureReason}</span>
                        ) : null}
                      </div>
                      <div className="grid gap-2 md:grid-cols-[120px_1fr_auto]">
                        <input
                          type="number"
                          step={0.01}
                          placeholder="Manual price"
                          value={overrideValues[line.id]?.price ?? ""}
                          onChange={(event) =>
                            setOverrideValues((current) => ({
                              ...current,
                              [line.id]: {
                                price: event.target.value,
                                note: current[line.id]?.note ?? "",
                              },
                            }))
                          }
                        />
                        <input
                          type="text"
                          placeholder="Note"
                          value={overrideValues[line.id]?.note ?? ""}
                          onChange={(event) =>
                            setOverrideValues((current) => ({
                              ...current,
                              [line.id]: {
                                note: event.target.value,
                                price: current[line.id]?.price ?? "",
                              },
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={overrideLoadingId === line.id || !(overrideValues[line.id]?.price ?? "")}
                          onClick={async () => {
                            try {
                              setOverrideLoadingId(line.id);
                              await fetchJson<{ result: unknown }>("/api/monthly-savings/manual-override", {
                                method: "POST",
                                body: JSON.stringify({
                                  executionLineId: line.id,
                                  manualPrice: Number(overrideValues[line.id]?.price ?? "0"),
                                  note: overrideValues[line.id]?.note ?? "",
                                }),
                              });
                              await load();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Override failed");
                            } finally {
                              setOverrideLoadingId(null);
                            }
                          }}
                        >
                          Override
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-brand-border bg-brand-surface p-3 text-sm text-brand-text2">
              <Icon icon={CircleAlert} size={16} color="warning" />
              No execution runs available yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
