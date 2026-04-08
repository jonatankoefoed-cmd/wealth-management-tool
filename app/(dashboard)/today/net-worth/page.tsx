"use client";

import { SnapshotView } from "@/components/today/snapshot-view";

export default function NetWorthPage() {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-brand-text1">Net Worth</h1>
                <p className="mt-2 text-brand-text2 max-w-2xl">
                    Real-time overview of your assets and liabilities derived from imported data.
                </p>
            </div>
            <SnapshotView />
        </div>
    );
}
