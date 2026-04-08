"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle, Wallet } from "lucide-react";

interface ManualHolding {
    id: string;
    ticker: string;
    name: string;
    quantity: string;
    avgCost: string;
    currency: string;
    assetType: string;
}

const CURRENCIES = ["DKK", "USD", "EUR", "GBP", "CAD", "SEK", "NOK"];
const ASSET_TYPES = ["EQUITY", "ETF", "FUND", "BOND", "OTHER"];

function generateId(): string {
    return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function HoldingsTab(): JSX.Element {
    const [holdings, setHoldings] = useState<ManualHolding[]>([
        { id: generateId(), ticker: "", name: "", quantity: "", avgCost: "", currency: "DKK", assetType: "EQUITY" },
    ]);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const addRow = () => {
        setHoldings((prev) => [
            ...prev,
            { id: generateId(), ticker: "", name: "", quantity: "", avgCost: "", currency: "DKK", assetType: "EQUITY" },
        ]);
    };

    const removeRow = (id: string) => {
        setHoldings((prev) => prev.filter((h) => h.id !== id));
    };

    const updateRow = (id: string, field: keyof ManualHolding, value: string) => {
        setHoldings((prev) =>
            prev.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
        );
    };

    const handleSave = useCallback(async () => {
        setSaving(true);
        setSuccess(false);
        try {
            const valid = holdings.filter((h) => h.ticker.trim() && h.quantity.trim());
            if (valid.length === 0) return;

            const res = await fetch("/api/portfolio/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ holdings: valid }),
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
    }, [holdings]);

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-brand-border">
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Ticker</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Navn</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Antal</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Gns. kurs</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Valuta</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Type</th>
                            <th className="pb-3 w-10" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                        {holdings.map((h) => (
                            <tr key={h.id} className="group transition-colors hover:bg-brand-surface/50">
                                <td className="py-2.5 pr-2">
                                    <input
                                        type="text"
                                        value={h.ticker}
                                        onChange={(e) => updateRow(h.id, "ticker", e.target.value.toUpperCase())}
                                        placeholder="NVDA"
                                        className="w-20 rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm font-mono tabular-nums"
                                    />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <input
                                        type="text"
                                        value={h.name}
                                        onChange={(e) => updateRow(h.id, "name", e.target.value)}
                                        placeholder="NVIDIA Corp"
                                        className="w-36 rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm"
                                    />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <input
                                        type="number"
                                        value={h.quantity}
                                        onChange={(e) => updateRow(h.id, "quantity", e.target.value)}
                                        placeholder="0"
                                        className="w-20 rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm tabular-nums text-right"
                                    />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <input
                                        type="number"
                                        value={h.avgCost}
                                        onChange={(e) => updateRow(h.id, "avgCost", e.target.value)}
                                        placeholder="0.00"
                                        step="0.01"
                                        className="w-24 rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm tabular-nums text-right"
                                    />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <select
                                        value={h.currency}
                                        onChange={(e) => updateRow(h.id, "currency", e.target.value)}
                                        className="rounded-md border border-brand-border bg-brand-surface2 px-2 py-1.5 text-sm"
                                    >
                                        {CURRENCIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="py-2.5 pr-2">
                                    <select
                                        value={h.assetType}
                                        onChange={(e) => updateRow(h.id, "assetType", e.target.value)}
                                        className="rounded-md border border-brand-border bg-brand-surface2 px-2 py-1.5 text-sm"
                                    >
                                        {ASSET_TYPES.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => removeRow(h.id)}
                                        className="rounded-md p-1.5 text-brand-text3 transition-colors hover:bg-brand-danger/10 hover:text-brand-danger"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <Button variant="ghost" onClick={addRow}>
                    <Plus className="h-4 w-4" />
                    Tilføj række
                </Button>
                <div className="flex-1" />
                {success && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-success animate-fade-in-up">
                        <CheckCircle className="h-4 w-4" />
                        Gemt!
                    </span>
                )}
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Gemmer..." : "Gem beholdninger"}
                </Button>
            </div>
        </div>
    );
}
