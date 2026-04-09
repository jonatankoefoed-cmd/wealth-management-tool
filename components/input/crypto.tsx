"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle, Bitcoin } from "lucide-react";

interface ManualCrypto {
    id: string;
    ticker: string;
    name: string;
    quantity: string;
    avgCost: string;
}

function generateId(): string {
    return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CryptoTab() {
    const [cryptos, setCryptos] = useState<ManualCrypto[]>([
        { id: generateId(), ticker: "", name: "", quantity: "", avgCost: "" },
    ]);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const addRow = () => {
        setCryptos((prev) => [
            ...prev,
            { id: generateId(), ticker: "", name: "", quantity: "", avgCost: "" },
        ]);
    };

    const removeRow = (id: string) => {
        setCryptos((prev) => prev.filter((c) => c.id !== id));
    };

    const updateRow = (id: string, field: keyof ManualCrypto, value: string) => {
        setCryptos((prev) =>
            prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
        );
    };

    const handleSave = useCallback(async () => {
        setSaving(true);
        setSuccess(false);
        try {
            const valid = cryptos.filter((c) => c.ticker.trim() && c.quantity.trim());
            if (valid.length === 0) return;

            const res = await fetch("/api/portfolio/manual-crypto", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cryptos: valid }),
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
    }, [cryptos]);

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-brand-border">
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Symbol</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Navn</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Antal</th>
                            <th className="pb-3 text-left text-xs font-medium uppercase tracking-wide text-brand-text3">Gns. kurs (USD)</th>
                            <th className="pb-3 w-10" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                        {cryptos.map((c) => (
                            <tr key={c.id} className="group transition-colors hover:bg-brand-surface/50">
                                <td className="py-2.5 pr-2">
                                    <input
                                        type="text"
                                        value={c.ticker}
                                        onChange={(e) => updateRow(c.id, "ticker", e.target.value.toUpperCase())}
                                        placeholder="BTC"
                                        className="w-20 rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm font-mono tabular-nums"
                                    />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <input
                                        type="text"
                                        value={c.name}
                                        onChange={(e) => updateRow(c.id, "name", e.target.value)}
                                        placeholder="Bitcoin"
                                        className="w-36 rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm"
                                    />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <input
                                        type="number"
                                        value={c.quantity}
                                        onChange={(e) => updateRow(c.id, "quantity", e.target.value)}
                                        placeholder="0.00000"
                                        step="0.00001"
                                        className="w-28 rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm tabular-nums text-right"
                                    />
                                </td>
                                <td className="py-2.5 pr-2">
                                    <input
                                        type="number"
                                        value={c.avgCost}
                                        onChange={(e) => updateRow(c.id, "avgCost", e.target.value)}
                                        placeholder="0.00"
                                        step="0.01"
                                        className="w-28 rounded-md border border-brand-border bg-brand-surface2 px-2.5 py-1.5 text-sm tabular-nums text-right"
                                    />
                                </td>
                                <td className="py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => removeRow(c.id)}
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
                    Tilføj krypto
                </Button>
                <div className="flex-1" />
                {success && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-success animate-fade-in-up">
                        <CheckCircle className="h-4 w-4" />
                        Gemt!
                    </span>
                )}
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Gemmer..." : "Gem krypto"}
                </Button>
            </div>
        </div>
    );
}
