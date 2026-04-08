"use client";

import { useEffect, useState } from "react";
import { YearlyMatrix } from "@/components/future/yearly-matrix";
import { YearlyCharts } from "@/components/future/yearly-charts";
import { fetchJson } from "@/lib/client";
import { EmptyState } from "@/components/shared/empty-state";
import { ReceiptText } from "lucide-react";

export function RollupsView() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchJson("/api/future/yearly-pnl?horizonYears=10")
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-12 text-center text-sm text-brand-text3 animate-pulse">Calculating yearly rollups...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-sm text-brand-danger">Failed to load yearly data: {error}</div>;
    }

    if (!data || !data.dataQuality?.hasIncomeInputs) {
        return (
            <EmptyState
                title="Start din fremtid"
                description="Vi mangler input omkring din indkomst og budget for at kunne fremskrive din økonomi."
                actionLabel="Gå til Inputs"
                onAction={() => window.location.href = "/input"}
                icon={ReceiptText}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <YearlyCharts data={data} />

            <div className="flex justify-end px-2">
                <p className="text-xs text-brand-text2 italic">
                    * Values derived strictly from monthly evolution (Sum of 12 months).
                </p>
            </div>
            <YearlyMatrix data={data} />
        </div>
    );
}
