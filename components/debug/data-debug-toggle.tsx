"use client";

import { useState } from "react";
import { Bug, X, Database, FileJson, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface DataDebugToggleProps {
    source: string;
    data: unknown;
    className?: string;
}

export function DataDebugToggle({ source, data, className }: DataDebugToggleProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Only render in development
    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    // Helper to extract audit info if present
    const auditSummary = extractAuditSummary(data);

    return (
        <div className={cn("fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2", className)}>
            {isOpen && (
                <div className="w-[450px] overflow-hidden rounded-lg border border-brand-border bg-brand-surface shadow-float animate-in fade-in slide-in-from-bottom-5">
                    <div className="flex items-center justify-between border-b border-brand-border bg-brand-surface2 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Icon icon={Database} size={16} color="accent" />
                            <span className="text-sm font-semibold text-brand-text1">Data Debugger</span>
                            <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-brand-text2 border border-brand-border">
                                DEV ONLY
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-brand-text2 hover:text-brand-text1"
                            onClick={() => setIsOpen(false)}
                        >
                            <Icon icon={X} size={16} />
                        </Button>
                    </div>

                    <div className="bg-brand-surface p-4 space-y-4">
                        {/* Source Info */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-text2 mb-1">
                                Data Source
                            </p>
                            <div className="flex items-center gap-2 rounded-md border border-brand-border bg-white px-3 py-2">
                                <code className="text-xs font-mono text-brand-text1">{source}</code>
                            </div>
                        </div>

                        {/* Audit Summary */}
                        {auditSummary && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-brand-text2 mb-1">
                                    Audit Check
                                </p>
                                <div className="rounded-md border border-brand-border bg-white p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            icon={auditSummary.hasAudits ? CheckCircle2 : AlertCircle}
                                            size={16}
                                            color={auditSummary.hasAudits ? "success" : "warning"}
                                        />
                                        <span className="text-xs text-brand-text1">
                                            {auditSummary.hasAudits ? "Contains audit trail" : "No audit trail found"}
                                        </span>
                                    </div>
                                    {auditSummary.warnings.length > 0 && (
                                        <div className="pt-2 border-t border-brand-border mt-2">
                                            <p className="text-[10px] font-bold text-brand-warning mb-1">WARNINGS</p>
                                            <ul className="list-disc pl-4 space-y-0.5">
                                                {auditSummary.warnings.map((w, i) => (
                                                    <li key={i} className="text-[10px] text-brand-text2">{w}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payload Viewer */}
                        <div className="flex-1 min-h-[200px] max-h-[400px] flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-brand-text2">
                                    Payload
                                </p>
                                <Icon icon={FileJson} size={16} color="muted" />
                            </div>
                            <div className="flex-1 rounded-md border border-brand-border bg-[#F8F9FA] overflow-hidden">
                                <div className="h-[300px] w-full overflow-auto">
                                    <div className="p-3">
                                        <pre className="text-[10px] leading-relaxed font-mono text-brand-text1 whitespace-pre-wrap break-all">
                                            {JSON.stringify(data, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-10 w-10 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95",
                    isOpen ? "bg-brand-text1 text-white" : "bg-brand-accent text-white hover:bg-brand-accent/90"
                )}
            >
                <Icon icon={Bug} size={20} className="text-white" />
            </Button>
        </div>
    );
}

function extractAuditSummary(data: any): { hasAudits: boolean; warnings: string[] } | null {
    if (!data || typeof data !== "object") return null;

    const hasAudits =
        (Array.isArray(data.audits) && data.audits.length > 0) ||
        (data.audits && typeof data.audits === "object" && Object.keys(data.audits).length > 0) ||
        (data.auditJson && typeof data.auditJson === "object");

    const warnings = Array.isArray(data.warnings) ? data.warnings :
        Array.isArray(data.holdingsWarnings) ? data.holdingsWarnings : [];

    return { hasAudits, warnings };
}
