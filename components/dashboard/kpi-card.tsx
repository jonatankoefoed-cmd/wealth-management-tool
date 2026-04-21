import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { MetricTrend, type TrendDirection } from "./metric-trend";
import { StatusChip } from "@/components/shared/status-chip";
import { Sparkline } from "@/components/charts/sparkline";

interface KpiCardProps {
    title: string;
    value: string;
    icon?: LucideIcon;
    trend?: {
        value: number;
        direction: TrendDirection;
        label?: string;
    };
    sparklineData?: number[];
    footer?: React.ReactNode;
    status?: "SUCCESS" | "WARNING" | "DANGER";
    statusLabel?: string;
    size?: "default" | "large";
    className?: string;
}

export function KpiCard({
    title,
    value,
    icon,
    trend,
    sparklineData,
    footer,
    status,
    statusLabel,
    size = "default",
    className,
}: KpiCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-brand-border/50 bg-white/60 p-5 backdrop-blur-xl shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-0.5 group",
                size === "large" && "p-7",
                className,
            )}
        >
            {/* Background Glow */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-brand-accent/5 blur-3xl transition-opacity group-hover:opacity-100 opacity-0" />
            
            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text3 antialiased">
                        {title}
                    </p>
                    <p
                        className={cn(
                            "mt-3 truncate font-semibold tabular-nums text-brand-text1 leading-none tracking-tight",
                            size === "large" ? "text-4xl" : "text-3xl",
                        )}
                    >
                        {value}
                    </p>

                    {sparklineData && (
                        <div className="mt-4">
                            <Sparkline data={sparklineData} height={40} />
                        </div>
                    )}

                    {!sparklineData && trend && (
                        <div className="mt-3">
                            <MetricTrend
                                value={trend.value}
                                direction={trend.direction}
                                label={trend.label}
                            />
                        </div>
                    )}

                    {status && (
                        <div className="mt-3 flex items-center gap-2">
                            <StatusChip status={status} />
                            {statusLabel && (
                                <span className="text-[11px] font-semibold text-brand-text2/80">
                                    {statusLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent/10 to-brand-accent/5 ring-1 ring-brand-accent/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_-5px_rgba(var(--brand-accent-rgb),0.3)]">
                        <Icon icon={icon} size={24} color="accent" />
                    </div>
                )}
            </div>
            {footer && <div className="mt-5 border-t border-brand-border/30 pt-4">{footer}</div>}
        </div>
    );
}
