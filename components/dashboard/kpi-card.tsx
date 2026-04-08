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
}: KpiCardProps): JSX.Element {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-brand-border bg-brand-surface2 p-5 shadow-soft transition-shadow hover:shadow-card",
                size === "large" && "p-6",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-text2">
                        {title}
                    </p>
                    <p
                        className={cn(
                            "mt-2 truncate font-semibold tabular-nums text-brand-text1",
                            size === "large" ? "text-3xl" : "text-2xl",
                        )}
                    >
                        {value}
                    </p>

                    {sparklineData && (
                        <div className="mt-3">
                            <Sparkline data={sparklineData} height={32} />
                        </div>
                    )}

                    {!sparklineData && trend && (
                        <div className="mt-2">
                            <MetricTrend
                                value={trend.value}
                                direction={trend.direction}
                                label={trend.label}
                            />
                        </div>
                    )}

                    {status && (
                        <div className="mt-2 flex items-center gap-1.5">
                            <StatusChip status={status} />
                            {statusLabel && (
                                <span className="text-[10px] font-medium text-brand-text3">
                                    {statusLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-accent/15 to-brand-accent/5 ring-1 ring-brand-accent/10">
                        <Icon icon={icon} size={20} color="accent" />
                    </div>
                )}
            </div>
            {footer && <div className="mt-4 border-t border-brand-border pt-3">{footer}</div>}
        </div>
    );
}
