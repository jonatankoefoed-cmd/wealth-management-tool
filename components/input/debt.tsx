"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle, Landmark } from "lucide-react";
import { FormField } from "./shared";

interface ManualDebt {
    id: string;
    name: string;
    balance: string;
    rate: string;
    type: string;
}

const DEBT_TYPES = ["SU", "MORTGAGE", "CAR_LOAN", "PERSONAL", "OTHER"];

function generateId(): string {
    return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DebtTab(): JSX.Element {
    const [debts, setDebts] = useState<ManualDebt[]>([
        { id: generateId(), name: "", balance: "", rate: "", type: "SU" },
    ]);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const addRow = () => {
        setDebts((prev) => [
            ...prev,
            { id: generateId(), name: "", balance: "", rate: "", type: "SU" },
        ]);
    };

    const removeRow = (id: string) => {
        setDebts((prev) => prev.filter((d) => d.id !== id));
    };

    const updateRow = (id: string, field: keyof ManualDebt, value: string) => {
        setDebts((prev) =>
            prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
        );
    };

    const handleSave = useCallback(async () => {
        setSaving(true);
        setSuccess(false);
        try {
            const valid = debts.filter((d) => d.name.trim() && d.balance.trim());
            if (valid.length === 0) return;

            const res = await fetch("/api/debts/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ debts: valid }),
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch {
            // silent for now
        } finally {
            setSaving(false);
        }
    }, [debts]);

    return (
        <div className="space-y-4">
            {debts.map((d) => (
                <div key={d.id} className="grid gap-3 rounded-lg border border-brand-border bg-brand-surface/30 p-4 sm:grid-cols-2 lg:grid-cols-5">
                    <FormField label="Navn">
                        <input
                            type="text"
                            value={d.name}
                            onChange={(e) => updateRow(d.id, "name", e.target.value)}
                            placeholder="SU-lån 06"
                            className="w-full rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm"
                        />
                    </FormField>
                    <FormField label="Restgæld (DKK)">
                        <input
                            type="number"
                            value={d.balance}
                            onChange={(e) => updateRow(d.id, "balance", e.target.value)}
                            placeholder="204106"
                            className="w-full rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm tabular-nums text-right"
                        />
                    </FormField>
                    <FormField label="Årlig rente (%)">
                        <input
                            type="number"
                            value={d.rate}
                            onChange={(e) => updateRow(d.id, "rate", e.target.value)}
                            placeholder="4.0"
                            step="0.1"
                            className="w-full rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm tabular-nums text-right"
                        />
                    </FormField>
                    <FormField label="Type">
                        <select
                            value={d.type}
                            onChange={(e) => updateRow(d.id, "type", e.target.value)}
                            className="w-full rounded-md border border-brand-border bg-brand-surface2 px-2 py-1.5 text-sm"
                        >
                            {DEBT_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </FormField>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={() => removeRow(d.id)}
                            className="rounded-md p-2 text-brand-text3 transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
                <Button variant="ghost" onClick={addRow}>
                    <Plus className="h-4 w-4" />
                    Tilføj gæld
                </Button>
                <div className="flex-1" />
                {success && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-success animate-fade-in-up">
                        <CheckCircle className="h-4 w-4" />
                        Gemt!
                    </span>
                )}
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Gemmer..." : "Gem gæld"}
                </Button>
            </div>
        </div>
    );
}
