import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type IconSize = 16 | 18 | 20 | 24;

type IconColor = "primary" | "secondary" | "muted" | "accent" | "success" | "warning" | "danger";

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  color?: IconColor;
  className?: string;
  label?: string;
}

const sizeClassMap: Record<IconSize, string> = {
  16: "h-4 w-4",
  18: "h-[18px] w-[18px]",
  20: "h-5 w-5",
  24: "h-6 w-6",
};

const colorClassMap: Record<IconColor, string> = {
  primary: "text-brand-text1",
  secondary: "text-brand-text2",
  muted: "text-brand-text3",
  accent: "text-brand-accent",
  success: "text-brand-success",
  warning: "text-brand-warning",
  danger: "text-brand-danger",
};

export function Icon({
  icon: IconComponent,
  size = 20,
  color = "secondary",
  className,
  label,
}: IconProps) {
  return (
    <IconComponent
      aria-hidden={!label}
      aria-label={label}
      strokeWidth={1.75}
      className={cn(sizeClassMap[size], colorClassMap[color], className)}
    />
  );
}
