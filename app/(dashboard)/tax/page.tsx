"use client";

import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { Icon } from "@/components/ui/icon";
import { SectionLoading } from "@/components/shared/section-loading";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";

interface TaxDefaultsResponse {
  defaults: {
    taxYear: number;
    municipality: {
      rate: number;
      churchRate: number;
    };
    personalIncome: {
      grossIncome: number;
      pensionContributions: number;
      customDeductions: number;
    };
    investments: {
      equityIncome: {
        realizedGains: number;
        realizedLosses: number;
        dividends: number;
        lossCarryForwardFromPriorYears: number;
      };
    };
  };
  testCaseIds: string[];
  firstTestCase: {
    id: string;
    input: Record<string, unknown>;
  };
}

interface TaxResultResponse {
  input: unknown;
  result: {
    totals: {
      totalTax: number;
      personalTaxTotal: number;
      equityTaxTotal: number;
      askTaxTotal: number;
      markToMarketTaxTotal: number;
      capitalTaxTotal: number;
    };
    breakdown: {
      personal?: {
        audit: ExplainAudit;
      };
      equity?: {
        audit: ExplainAudit;
      };
      ask?: {
        audit: ExplainAudit;
      };
      markToMarket?: {
        audit: ExplainAudit;
      };
      capital?: {
        note: string;
      };
    };
    summaryAudit: ExplainAudit;
    warnings: string[];
    assumptions: string[];
  };
}

interface TaxForm {
  taxYear: number;
  municipalityRate: number;
  churchRate: number;
  isMarried: boolean;
  salaryGross: number;
  pensionEmployee: number;
  deductionOther: number;
  realizedGains: number;
  dividends: number;
  lossesCarryForwardUsed: number;
  askOpening: number;
  askClosing: number;
  askNetDeposits: number;
  askNetWithdrawals: number;
}

const initialForm: TaxForm = {
  taxYear: 2026,
  municipalityRate: 0.25,
  churchRate: 0.007,
  isMarried: false,
  salaryGross: 500000,
  pensionEmployee: 0,
  deductionOther: 0,
  realizedGains: 40000,
  dividends: 20000,
  lossesCarryForwardUsed: 0,
  askOpening: 100000,
  askClosing: 120000,
  askNetDeposits: 0,
  askNetWithdrawals: 0,
};

export default function TaxPage(): JSX.Element {
  const [form, setForm] = useState<TaxForm>(initialForm);
  const [defaults, setDefaults] = useState<TaxDefaultsResponse | null>(null);
  const [result, setResult] = useState<TaxResultResponse["result"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchJson<TaxDefaultsResponse>("/api/tax")
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setDefaults(payload);
        setForm((current) => ({
          ...current,
          taxYear: payload.defaults.taxYear,
          municipalityRate: payload.defaults.municipality.rate,
          churchRate: payload.defaults.municipality.churchRate,
          salaryGross: payload.defaults.personalIncome.grossIncome,
          pensionEmployee: payload.defaults.personalIncome.pensionContributions,
          deductionOther: payload.defaults.personalIncome.customDeductions,
          realizedGains: payload.defaults.investments.equityIncome.realizedGains,
          dividends: payload.defaults.investments.equityIncome.dividends,
          lossesCarryForwardUsed:
            payload.defaults.investments.equityIncome.lossCarryForwardFromPriorYears,
        }));
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load tax defaults");
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

  if (error && !defaults) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>Tax Run Form</CardTitle>
          <CardDescription>Input values sent directly to tax engine (DKK yearly amounts)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-brand-text2">
              Tax year
              <input
                type="number"
                className="mt-1 w-full"
                value={form.taxYear}
                onChange={(event) => setForm((current) => ({ ...current, taxYear: Number(event.target.value) }))}
              />
            </label>
            <label className="text-sm text-brand-text2">
              Municipality rate
              <input
                type="number"
                step={0.0001}
                className="mt-1 w-full"
                value={form.municipalityRate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, municipalityRate: Number(event.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-brand-text2">
              Church rate
              <input
                type="number"
                step={0.0001}
                className="mt-1 w-full"
                value={form.churchRate}
                onChange={(event) => setForm((current) => ({ ...current, churchRate: Number(event.target.value) }))}
              />
            </label>
            <label className="flex items-center gap-2 rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text1">
              <input
                type="checkbox"
                checked={form.isMarried}
                onChange={(event) => setForm((current) => ({ ...current, isMarried: event.target.checked }))}
              />
              Married thresholds
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-brand-text2">
              Salary gross
              <input
                type="number"
                className="mt-1 w-full"
                value={form.salaryGross}
                onChange={(event) => setForm((current) => ({ ...current, salaryGross: Number(event.target.value) }))}
              />
            </label>
            <label className="text-sm text-brand-text2">
              Pension employee
              <input
                type="number"
                className="mt-1 w-full"
                value={form.pensionEmployee}
                onChange={(event) =>
                  setForm((current) => ({ ...current, pensionEmployee: Number(event.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-brand-text2">
              Other deductions
              <input
                type="number"
                className="mt-1 w-full"
                value={form.deductionOther}
                onChange={(event) =>
                  setForm((current) => ({ ...current, deductionOther: Number(event.target.value) }))
                }
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm text-brand-text2">
              Realized gains
              <input
                type="number"
                className="mt-1 w-full"
                value={form.realizedGains}
                onChange={(event) =>
                  setForm((current) => ({ ...current, realizedGains: Number(event.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-brand-text2">
              Dividends
              <input
                type="number"
                className="mt-1 w-full"
                value={form.dividends}
                onChange={(event) => setForm((current) => ({ ...current, dividends: Number(event.target.value) }))}
              />
            </label>
            <label className="text-sm text-brand-text2">
              Loss carry forward used
              <input
                type="number"
                className="mt-1 w-full"
                value={form.lossesCarryForwardUsed}
                onChange={(event) =>
                  setForm((current) => ({ ...current, lossesCarryForwardUsed: Number(event.target.value) }))
                }
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-brand-text2">
              ASK opening value
              <input
                type="number"
                className="mt-1 w-full"
                value={form.askOpening}
                onChange={(event) => setForm((current) => ({ ...current, askOpening: Number(event.target.value) }))}
              />
            </label>
            <label className="text-sm text-brand-text2">
              ASK closing value
              <input
                type="number"
                className="mt-1 w-full"
                value={form.askClosing}
                onChange={(event) => setForm((current) => ({ ...current, askClosing: Number(event.target.value) }))}
              />
            </label>
            <label className="text-sm text-brand-text2">
              ASK net deposits
              <input
                type="number"
                className="mt-1 w-full"
                value={form.askNetDeposits}
                onChange={(event) =>
                  setForm((current) => ({ ...current, askNetDeposits: Number(event.target.value) }))
                }
              />
            </label>
            <label className="text-sm text-brand-text2">
              ASK net withdrawals
              <input
                type="number"
                className="mt-1 w-full"
                value={form.askNetWithdrawals}
                onChange={(event) =>
                  setForm((current) => ({ ...current, askNetWithdrawals: Number(event.target.value) }))
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-brand-text2">
              Available verification cases: {defaults?.testCaseIds.join(", ") ?? "No cases found"}
            </div>
            <Button
              variant="primary"
              disabled={running}
              onClick={async () => {
                try {
                  setRunning(true);
                  const response = await fetchJson<TaxResultResponse>("/api/tax", {
                    method: "POST",
                    body: JSON.stringify({
                      taxYear: form.taxYear,
                      municipality: {
                        rate: form.municipalityRate,
                        churchRate: form.churchRate,
                      },
                      personalIncome: {
                        salaryGross: form.salaryGross,
                        pensionEmployee: form.pensionEmployee,
                        deductions: {
                          other: form.deductionOther,
                        },
                      },
                      investments: {
                        equityIncome: {
                          realizedGains: form.realizedGains,
                          dividends: form.dividends,
                          lossesCarryForwardUsed: form.lossesCarryForwardUsed,
                        },
                        ask: {
                          openingValue: form.askOpening,
                          closingValue: form.askClosing,
                          netDeposits: form.askNetDeposits,
                          netWithdrawals: form.askNetWithdrawals,
                        },
                      },
                      isMarried: form.isMarried,
                    }),
                  });

                  setResult(response.result);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Tax run failed");
                } finally {
                  setRunning(false);
                }
              }}
            >
              Run Tax Calculation
            </Button>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-brand-text2">Total Tax</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-text1">
                  {formatDKK(result.totals.totalTax)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-brand-text2">Personal Tax</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-text1">
                  {formatDKK(result.totals.personalTaxTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-brand-text2">Equity Tax</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-text1">
                  {formatDKK(result.totals.equityTaxTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-brand-text2">ASK Tax</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-text1">
                  {formatDKK(result.totals.askTaxTotal)}
                </p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Audit Details</CardTitle>
              <CardDescription>Every major number links to an explain drawer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-brand-border bg-brand-surface p-3">
                <div>
                  <p className="text-sm font-medium text-brand-text1">Summary audit</p>
                  <p className="text-xs text-brand-text2">Total annual tax aggregation</p>
                </div>
                <ExplainDrawer audit={result.summaryAudit} />
              </div>

              {result.breakdown.personal ? (
                <div className="flex items-center justify-between rounded-md border border-brand-border bg-brand-surface p-3">
                  <p className="text-sm font-medium text-brand-text1">Personal tax audit</p>
                  <ExplainDrawer audit={result.breakdown.personal.audit} />
                </div>
              ) : null}

              {result.breakdown.equity ? (
                <div className="flex items-center justify-between rounded-md border border-brand-border bg-brand-surface p-3">
                  <p className="text-sm font-medium text-brand-text1">Equity tax audit</p>
                  <ExplainDrawer audit={result.breakdown.equity.audit} />
                </div>
              ) : null}

              {result.breakdown.ask ? (
                <div className="flex items-center justify-between rounded-md border border-brand-border bg-brand-surface p-3">
                  <p className="text-sm font-medium text-brand-text1">ASK tax audit</p>
                  <ExplainDrawer audit={result.breakdown.ask.audit} />
                </div>
              ) : null}

              {result.breakdown.markToMarket ? (
                <div className="flex items-center justify-between rounded-md border border-brand-border bg-brand-surface p-3">
                  <p className="text-sm font-medium text-brand-text1">Mark-to-market audit</p>
                  <ExplainDrawer audit={result.breakdown.markToMarket.audit} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {result.warnings.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Warnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-brand-warning">
                {result.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-brand-surface">
              <Icon icon={Calculator} size={18} color="secondary" />
            </div>
            <p className="text-sm text-brand-text2">Run a tax calculation to view audited breakdowns.</p>
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card className="border-brand-danger/40 bg-[#FDECEC]">
          <CardContent className="p-3 text-sm text-brand-danger">{error}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
