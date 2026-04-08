"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

export type TrendDirection = "up" | "down" | "neutral";

interface MetricTrendProps {
    value: number;
    direction: TrendDirection;
    label?: string;
    showIcon?: boolean;
    size?: "sm" | "md";
}

export function MetricTrend({
    value,
    direction,
    label,
    showIcon = true,
    size = "sm",
}: MetricTrendProps): JSX.Element {
    const isPositive = direction === "up";
    const isNegative = direction === "down";
    const isNeutral = direction === "neutral";

    const trendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

    const colorClass = isPositive
        ? "text-brand-success"
        : isNegative
            ? "text-brand-danger"
            : "text-brand-text3";

    const bgClass = isPositive
        ? "bg-brand-success/10"
        : isNegative
            ? "bg-brand-danger/10"
            : "bg-brand-text3/10";

    const formattedValue = `${isPositive ? "+" : ""}${value.toFixed(1)}%`;

    return (
        <div className="inline-flex items-center gap-1.5">
            <span
                className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium tabular-nums",
                    bgClass,
                    colorClass,
                    size === "sm" ? "text-xs" : "text-sm",
                )}
            >
                {showIcon && (
                    <Icon
                        icon={trendIcon}
                        size={size === "sm" ? 12 : 14}
                        className={colorClass}
                    />
                )}
                {formattedValue}
            </span>
            {label && (
                <span className={cn("text-brand-text3", size === "sm" ? "text-xs" : "text-sm")}>
                    {label}
                </span>
            )}
        </div>
    );
}
