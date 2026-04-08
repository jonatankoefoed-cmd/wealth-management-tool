"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EvolutionMatrix } from "@/components/future/evolution-matrix";
import { RollupsView } from "@/components/future/rollups-view";
import { ChartsView } from "@/components/future/charts-view";
import { cn } from "@/lib/cn";
import { TrendingUp, CalendarRange, AreaChart } from "lucide-react";
import { fetchJson } from "@/lib/client";
import { EmptyState } from "@/components/shared/empty-state";
import { ReceiptText } from "lucide-react";

type FutureTab = "evolution" | "rollups" | "charts";

const TABS: { key: FutureTab; label: string; icon: any; description: string }[] = [
    { key: "evolution", label: "Monthly Evolution", icon: CalendarRange, description: "Detailed 10-year monthly projection" },
    { key: "rollups", label: "Yearly P&L (Rollups)", icon: TrendingUp, description: "Aggregated annual performance" },
    { key: "charts", label: "Future Charts", icon: AreaChart, description: "Visual wealth trajectory" },
];

export default function FuturePage() {
    const [activeTab, setActiveTab] = useState<FutureTab>("evolution");
    const [evolutionData, setEvolutionData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetchJson("/api/future/monthly-evolution?horizonYears=10");
                setEvolutionData(res);
            } catch (err) {
                console.error("Failed to load evolution data", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const activeTabMeta = TABS.find(t => t.key === activeTab);

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-brand-text1">Future</h1>
                <p className="mt-2 text-brand-text2 max-w-2xl">
                    Explore your financial trajectory over the next 10 years based on your inputs.
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TABS.map((tab) => {
                    const active = activeTab === tab.key;
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "group flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 h-full",
                                active
                                    ? "border-brand-accent/60 bg-brand-accent/10 shadow-soft"
                                    : "border-brand-border bg-brand-surface2 hover:border-brand-accent/30 hover:shadow-soft",
                            )}
                        >
                            <div
                                className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                                    active
                                        ? "bg-brand-accent text-brand-textInvert"
                                        : "bg-brand-surface text-brand-text2 group-hover:bg-brand-accent/10 group-hover:text-brand-accent",
                                )}
                            >
                                <TabIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className={cn("text-sm font-semibold", active ? "text-brand-text1" : "text-brand-text2")}>
                                    {tab.label}
                                </p>
                                <p className="mt-1 line-clamp-2 text-xs text-brand-text3 leading-snug">{tab.description}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Active Content */}
            {loading ? (
                <div className="p-12 text-center text-sm text-brand-text3 animate-pulse">Calculating 10-year trajectory...</div>
            ) : !evolutionData ? (
                <div className="p-8 text-center text-sm text-brand-danger">Failed to load data.</div>
            ) : (!evolutionData.dataQuality?.hasIncomeInputs) ? (
                <EmptyState
                    title="Start din fremtid"
                    description="Vi mangler input omkring din indkomst og budget for at kunne fremskrive din økonomi."
                    actionLabel="Gå til Imputs"
                    onAction={() => window.location.href = "/input"}
                    icon={ReceiptText}
                />
            ) : (
                <div className="space-y-4">
                    {activeTab === "evolution" && (
                        <>
                            <p className="text-xs text-brand-text2 text-right italic">
                                * Projections derived from 'Inputs' tab. Read-only.
                            </p>
                            <EvolutionMatrix data={evolutionData} />
                        </>
                    )}

                    {activeTab === "rollups" && <RollupsView />}
                    {activeTab === "charts" && <ChartsView data={evolutionData} />}
                </div>
            )}
        </div>
    );
}
