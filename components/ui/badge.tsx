import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "partial";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClassMap: Record<BadgeVariant, string> = {
  neutral: "bg-brand-surface text-brand-text2 border-brand-border",
  success: "bg-[#E9F8EF] text-brand-success border-[#B9E4C9]",
  warning: "bg-[#FEF6E7] text-brand-warning border-[#F8D8A0]",
  danger: "bg-[#FDECEC] text-brand-danger border-[#F6C2C2]",
  partial: "bg-[#F8F4E5] text-[#9D7A2C] border-[#E8D8A9]",
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        variantClassMap[variant],
        className,
      )}
      {...props}
    />
  );
}
