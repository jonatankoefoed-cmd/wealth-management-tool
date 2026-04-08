"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

function FormatGuide(): JSX.Element {
    const [open, setOpen] = useState(false);

    return (
        <Card className="border-brand-border/50">
            <CardHeader className="cursor-pointer py-3" onClick={() => setOpen(!open)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">CSV-format vejledning</CardTitle>
                    {open ? <ChevronUp className="h-4 w-4 text-brand-text3" /> : <ChevronDown className="h-4 w-4 text-brand-text3" />}
                </div>
            </CardHeader>
            {open && (
                <CardContent className="pt-0">
                    <div className="space-y-4 text-sm text-brand-text2">
                        <div>
                            <p className="mb-1 font-medium text-brand-text1">Påkrævet format:</p>
                            <code className="block rounded-md bg-brand-surface px-3 py-2 text-xs font-mono">
                                ticker,name,quantity,avgCost,costCurrency,assetType
                            </code>
                        </div>
                        <div>
                            <p className="mb-1 font-medium text-brand-text1">Eksempel:</p>
                            <code className="block rounded-md bg-brand-surface px-3 py-2 text-xs font-mono leading-relaxed whitespace-pre">
                                {`NVDA,NVIDIA Corp,60,185.41,USD,EQUITY
AAPL,Apple Inc,6,278.12,USD,EQUITY
BTC,Bitcoin,0.5,69846.63,USD,CRYPTO`}
                            </code>
                        </div>
                        <div>
                            <p className="mb-1 font-medium text-brand-text1">Understøttede kolonner:</p>
                            <ul className="list-inside list-disc space-y-1">
                                <li><span className="font-mono text-xs">ticker</span> — Fondskode eller symbol</li>
                                <li><span className="font-mono text-xs">name</span> — Instrumentnavn</li>
                                <li><span className="font-mono text-xs">quantity</span> — Antal enheder</li>
                                <li><span className="font-mono text-xs">avgCost</span> — Gennemsnitspris</li>
                                <li><span className="font-mono text-xs">costCurrency</span> — DKK, USD, EUR, etc.</li>
                                <li><span className="font-mono text-xs">assetType</span> — EQUITY, ETF, FUND, CRYPTO</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

export function ImportTab(): JSX.Element {
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped && (dropped.name.endsWith(".csv") || dropped.name.endsWith(".xlsx"))) {
            setFile(dropped);
            setResult(null);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setResult(null);
        }
    };

    const handleUpload = useCallback(async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/portfolio/import", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                setResult({ success: true, message: `${file.name} importeret succesfuldt` });
                setFile(null);
            } else {
                const data = await res.json().catch(() => ({}));
                setResult({ success: false, message: data.error || "Import fejlede" });
            }
        } catch {
            setResult({ success: false, message: "Netverksfejl under import" });
        } finally {
            setUploading(false);
        }
    }, [file]);

    return (
        <div className="space-y-6">
            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                    "relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all duration-200",
                    dragOver
                        ? "border-brand-accent bg-brand-accent/5 scale-[1.01]"
                        : "border-brand-border/60 bg-brand-surface/30 hover:border-brand-accent/40 hover:bg-brand-surface/50",
                )}
            >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-accent/15 to-brand-accent/5 ring-1 ring-brand-accent/10">
                    <Upload className="h-6 w-6 text-brand-accent" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium text-brand-text1">
                        Træk din CSV- eller XLSX-fil her
                    </p>
                    <p className="mt-1 text-xs text-brand-text3">
                        Understøtter Nordnet, Saxo, Binance eksportformater
                    </p>
                </div>
                <label className="cursor-pointer">
                    <Button variant="secondary" size="sm" className="pointer-events-none">
                        Vælg fil
                    </Button>
                    <input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleFileSelect}
                        className="sr-only"
                    />
                </label>
            </div>

            {/* Selected File */}
            {file && (
                <div className="flex items-center gap-3 rounded-lg border border-brand-accent/30 bg-brand-accent/5 px-4 py-3">
                    <FileText className="h-5 w-5 text-brand-accent" />
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-brand-text1">{file.name}</p>
                        <p className="text-xs text-brand-text3">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={handleUpload} disabled={uploading}>
                        {uploading ? "Importerer..." : "Importer"}
                    </Button>
                    <button
                        type="button"
                        onClick={() => { setFile(null); setResult(null); }}
                        className="rounded-md p-1.5 text-brand-text3 hover:text-brand-danger"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm",
                    result.success
                        ? "border-brand-success/30 bg-brand-success/5 text-brand-success"
                        : "border-brand-danger/30 bg-brand-danger/5 text-brand-danger",
                )}>
                    {result.success ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {result.message}
                </div>
            )}

            {/* Format Guide */}
            <FormatGuide />
        </div>
    );
}
