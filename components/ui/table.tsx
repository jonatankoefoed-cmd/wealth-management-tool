import type { HTMLAttributes, TableHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function TableShell({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-brand-border bg-brand-surface2 shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function TableWrap({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn("overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>): JSX.Element {
  return <table className={cn("min-w-full border-collapse", className)} {...props} />;
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>): JSX.Element {
  return <thead className={cn("sticky top-0 z-10 bg-brand-surface", className)} {...props} />;
}

export function TH({ className, ...props }: HTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return (
    <th
      className={cn(
        "border-b border-brand-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-text2",
        className,
      )}
      {...props}
    />
  );
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>): JSX.Element {
  return (
    <tr
      className={cn(
        "border-b border-brand-border/70 last:border-b-0 hover:bg-brand-surface/60",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: HTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={cn("px-4 py-3 text-sm text-brand-text1", className)} {...props} />;
}
