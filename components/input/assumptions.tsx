"use client";

import { useProjectionModel } from "@/hooks/use-projection-model";
import { FormField } from "./shared";
import { Settings2, Calendar, MapPin, Users } from "lucide-react";

const MUNICIPALITIES = [
    { id: "copenhagen", name: "Copenhagen", rate: 0.2506 },
    { id: "aarhus", name: "Aarhus", rate: 0.2560 },
    { id: "odense", name: "Odense", rate: 0.2620 },
    { id: "aalborg", name: "Aalborg", rate: 0.2600 },
];

export function AssumptionsTab() {
    const { inputs, updateInputs, loading } = useProjectionModel();

    if (loading || !inputs) {
        return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading assumptions...</div>;
    }

    const baseline = inputs.baseline || {
        monthlyDisposableIncomeBeforeHousing: 35000,
        monthlyNonHousingExpenses: 20000,
        retirementAge: 67,
        municipality: "copenhagen",
        maritalStatus: "single"
    };
    const months = inputs.months || 120;

    return (
        <div className="space-y-8 max-w-4xl animate-fade-in-up">
            <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-text3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Projection Horizon
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Projection Length (Years)">
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="40"
                                step="1"
                                value={Math.floor(months / 12)}
                                onChange={e => updateInputs({ months: Number(e.target.value) * 12 })}
                                className="flex-1 accent-brand-accent"
                            />
                            <span className="text-sm font-medium tabular-nums w-12 text-center">
                                {Math.floor(months / 12)} <span className="text-xs text-brand-text3">yrs</span>
                            </span>
                        </div>
                        <p className="text-xs text-brand-text3 mt-1">How many years into the future to project.</p>
                    </FormField>

                    <FormField label="Target Retirement Age">
                        <input
                            type="number"
                            value={baseline.retirementAge || 67}
                            onChange={e => updateInputs({ baseline: { ...baseline, retirementAge: Number(e.target.value) } })}
                            className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm tabular-nums"
                        />
                        <p className="text-xs text-brand-text3 mt-1">Salary income stops after this age.</p>
                    </FormField>
                </div>
            </section>

            <section className="space-y-4 border-t border-brand-border pt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-text3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Tax Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="Municipality (Kommune)">
                        <select
                            value={baseline.municipality || "copenhagen"}
                            onChange={e => updateInputs({ baseline: { ...baseline, municipality: e.target.value } })}
                            className="w-full rounded-md border border-brand-border bg-brand-surface2 px-3 py-2 text-sm"
                        >
                            {MUNICIPALITIES.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-brand-text3 mt-1">Determines your local tax rate.</p>
                    </FormField>

                    <FormField label="Marital Status">
                        <div className="flex gap-2 p-1 bg-brand-surface2 border border-brand-border rounded-lg">
                            {(['single', 'married'] as const).map(status => (
                                <button
                                    key={status}
                                    onClick={() => updateInputs({ baseline: { ...baseline, maritalStatus: status } })}
                                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${(baseline.maritalStatus || 'single') === status
                                        ? "bg-brand-accent text-brand-textInvert shadow-sm"
                                        : "text-brand-text2 hover:text-brand-text1 hover:bg-brand-surface"
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-brand-text3 mt-1">Influences tax deductions (e.g. transfer of unused deduction).</p>
                    </FormField>
                </div>
            </section>
        </div>
    );
}
