import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-50";

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "border-brand-accent bg-brand-accent text-brand-textInvert hover:bg-[#95A493]",
  secondary:
    "border-brand-border bg-brand-surface2 text-brand-text1 hover:bg-brand-surface",
  ghost: "border-transparent bg-transparent text-brand-text2 hover:bg-brand-surface",
  danger: "border-brand-danger bg-brand-danger text-brand-textInvert hover:bg-[#BE1F1F]",
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "h-9 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-5",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(baseClass, variantClassMap[variant], sizeClassMap[size], className)}
      {...props}
    />
  );
}
