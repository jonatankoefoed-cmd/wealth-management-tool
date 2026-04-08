"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { refreshPrices } from "@/actions/finance";
import { cn } from "@/lib/cn";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PriceRefresher() {
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoUpdate, setAutoUpdate] = useState(true);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    const handleRefresh = async () => {
        if (loading) return;
        setLoading(true);
        setStatus("idle");

        try {
            const result = await refreshPrices();
            if (result.success) {
                setLastUpdate(new Date());
                setStatus("success");
                setTimeout(() => setStatus("idle"), 3000);
            } else {
                setStatus("error");
            }
        } catch (e) {
            console.error(e);
            setStatus("error");
        } finally {
            setLoading(false);
            // Force a reload to reflect new data
            window.location.reload();
        }
    };

    // Auto-refresh every 5 minutes
    useEffect(() => {
        if (!autoUpdate) return;

        const interval = setInterval(() => {
            handleRefresh();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, [autoUpdate]);

    return (
        <div className="flex items-center gap-4 bg-card/50 backdrop-blur-sm border rounded-lg p-2 px-4 shadow-sm">
            <div className="flex items-center gap-2">
                <Switch
                    id="auto-update"
                    checked={autoUpdate}
                    onCheckedChange={setAutoUpdate}
                />
                <Label htmlFor="auto-update" className="text-xs text-muted-foreground whitespace-nowrap">
                    Auto (5m)
                </Label>
            </div>

            <div className="h-4 w-px bg-border" />

            <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className={cn(
                    "h-8 gap-2 text-xs font-medium transition-all",
                    status === "success" && "text-green-600 hover:text-green-700 bg-green-50",
                    status === "error" && "text-red-600 hover:text-red-700 bg-red-50"
                )}
            >
                {loading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : status === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                ) : status === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                )}
                {loading ? "Updating..." : status === "success" ? "Updated" : "Refresh Prices"}
            </Button>

            {lastUpdate && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                    Last: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </div>
    );
}
