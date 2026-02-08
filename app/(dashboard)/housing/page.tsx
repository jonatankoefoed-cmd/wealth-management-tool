"use client";

import { useEffect, useState } from "react";
import { Home, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExplainDrawer, type ExplainAudit } from "@/components/shared/explain-drawer";
import { Icon } from "@/components/ui/icon";
import { SectionLoading } from "@/components/shared/section-loading";
import { formatDKK } from "@/lib/format";
import { fetchJson } from "@/lib/client";

interface HousingForm {
  year: number;
  purchase: {
    price: number;
    downPaymentCash: number;
    closeDate: string;
  };
  financing: {
    mortgage: {
      enabled: boolean;
      termYears: number;
      amortizationProfile: "FULL" | "IO" | "CUSTOM";
      bondRateNominalAnnual: number;
      contributionRateAnnual: number;
      paymentsPerYear: 12;
    };
    bankLoan: {
      enabled: boolean;
      rateNominalAnnual: number;
      termYears: number;
      paymentsPerYear: 12;
    };
  };
  transactionCosts: {
    includeDefaultCosts: boolean;
    customCosts: Array<{ label: string; amount: number }>;
  };
  budgetIntegration: {
    monthlyDisposableIncomeBeforeHousing: number;
    monthlyHousingRunningCosts: number;
  };
  scenarioMeta: {
    scenarioId: string;
    notes?: string;
  };
}

interface HousingOutput {
  derived: {
    mortgagePrincipal: number;
    bankPrincipal: number;
    deedFee: number;
    mortgagePledgeFee: number;
    bankPledgeFee: number;
    totalUpfrontCosts: number;
  };
  monthly: {
    mortgagePayment: number;
    mortgageContribution: number;
    bankPayment: number;
    housingRunningCosts: number;
    totalHousingCostPerMonth: number;
    disposableAfterHousing: number;
  };
  balanceImpact: {
    assetHomeValueInitial: number;
    liabilitiesInitial: number;
    equityInitial: number;
  };
  audits: ExplainAudit[];
  warnings: string[];
  assumptions: string[];
}

interface HousingResponse {
  defaults: HousingForm;
  output: HousingOutput;
}

interface MetricCardProps {
  label: string;
  value: number;
  audit: ExplainAudit;
}

function MetricCard({ label, value, audit }: MetricCardProps): JSX.Element {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-brand-text2">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-brand-text1">{formatDKK(value)}</p>
        <div className="mt-2">
          <ExplainDrawer audit={audit} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function HousingPage(): JSX.Element {
  const [form, setForm] = useState<HousingForm | null>(null);
  const [output, setOutput] = useState<HousingOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchJson<HousingResponse>("/api/housing")
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setForm(payload.defaults);
        setOutput(payload.output);
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load housing defaults");
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

  if (error || !form || !output) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-brand-danger">{error ?? "Unable to load housing"}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Housing Simulation Input</CardTitle>
            <CardDescription>Editable assumptions passed directly to simulation engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm text-brand-text2">
                Purchase price (DKK)
                <input
                  type="number"
                  className="mt-1 w-full"
                  value={form.purchase.price}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            purchase: {
                              ...current.purchase,
                              price: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
              <label className="text-sm text-brand-text2">
                Down payment (DKK)
                <input
                  type="number"
                  className="mt-1 w-full"
                  value={form.purchase.downPaymentCash}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            purchase: {
                              ...current.purchase,
                              downPaymentCash: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
              <label className="text-sm text-brand-text2">
                Close date
                <input
                  type="date"
                  className="mt-1 w-full"
                  value={form.purchase.closeDate}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            purchase: {
                              ...current.purchase,
                              closeDate: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-brand-text2">
                Mortgage rate (annual)
                <input
                  type="number"
                  step={0.0001}
                  className="mt-1 w-full"
                  value={form.financing.mortgage.bondRateNominalAnnual}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            financing: {
                              ...current.financing,
                              mortgage: {
                                ...current.financing.mortgage,
                                bondRateNominalAnnual: Number(event.target.value),
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
              <label className="text-sm text-brand-text2">
                Bank rate (annual)
                <input
                  type="number"
                  step={0.0001}
                  className="mt-1 w-full"
                  value={form.financing.bankLoan.rateNominalAnnual}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            financing: {
                              ...current.financing,
                              bankLoan: {
                                ...current.financing.bankLoan,
                                rateNominalAnnual: Number(event.target.value),
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-brand-text2">
                Disposable income before housing
                <input
                  type="number"
                  className="mt-1 w-full"
                  value={form.budgetIntegration.monthlyDisposableIncomeBeforeHousing}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            budgetIntegration: {
                              ...current.budgetIntegration,
                              monthlyDisposableIncomeBeforeHousing: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
              <label className="text-sm text-brand-text2">
                Monthly running costs
                <input
                  type="number"
                  className="mt-1 w-full"
                  value={form.budgetIntegration.monthlyHousingRunningCosts}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            budgetIntegration: {
                              ...current.budgetIntegration,
                              monthlyHousingRunningCosts: Number(event.target.value),
                            },
                          }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <Button
              variant="primary"
              disabled={running}
              onClick={async () => {
                try {
                  setRunning(true);
                  const response = await fetchJson<{ output: HousingOutput }>("/api/housing", {
                    method: "POST",
                    body: JSON.stringify(form),
                  });
                  setOutput(response.output);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Simulation failed");
                } finally {
                  setRunning(false);
                }
              }}
            >
              Run Simulation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulation Notes</CardTitle>
            <CardDescription>Warnings and assumptions from the engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-surface">
              <Icon icon={Home} size={18} color="accent" />
            </div>
            {output.warnings.length > 0 ? (
              <ul className="space-y-2 text-sm text-brand-warning">
                {output.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-brand-text2">No engine warnings for current input.</p>
            )}
            <p className="text-sm text-brand-text2">{output.assumptions[0] ?? "No assumptions provided."}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Upfront Costs"
          value={output.derived.totalUpfrontCosts}
          audit={output.audits[0] ?? { title: "Upfront Costs" }}
        />
        <MetricCard
          label="Monthly Housing Cost"
          value={output.monthly.totalHousingCostPerMonth}
          audit={output.audits[output.audits.length - 1] ?? { title: "Monthly Cost" }}
        />
        <MetricCard
          label="Initial Equity Impact"
          value={output.balanceImpact.equityInitial}
          audit={
            output.audits.find((audit) => audit.title.toLowerCase().includes("loan")) ?? {
              title: "Balance Impact",
              steps: [
                {
                  label: "Equity",
                  formula: "home value - liabilities",
                  value: output.balanceImpact.equityInitial,
                  unit: "DKK",
                },
              ],
            }
          }
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Audit Objects</CardTitle>
          <CardDescription>Inspect each calculation module</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {output.audits.map((audit, index) => (
            <div
              key={`${audit.title}-${index}`}
              className="flex items-center justify-between rounded-md border border-brand-border bg-brand-surface p-3"
            >
              <div>
                <p className="text-sm font-medium text-brand-text1">{audit.title}</p>
                <p className="text-xs text-brand-text2">{audit.steps?.length ?? 0} steps</p>
              </div>
              <ExplainDrawer audit={audit} />
            </div>
          ))}
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-brand-danger/30 bg-[#FDECEC]">
          <CardContent className="p-3 text-sm text-brand-danger">
            <Icon icon={Sigma} size={16} color="danger" className="mr-1 inline-block" />
            {error}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
