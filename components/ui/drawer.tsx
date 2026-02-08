"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DrawerProps): JSX.Element | null {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        className="absolute inset-0 bg-[#332E2D]/25"
        aria-label="Close drawer"
        onClick={() => onOpenChange(false)}
      />
      <section
        className={cn(
          "relative h-full w-full max-w-xl overflow-y-auto border-l border-brand-border",
          "bg-brand-surface2 p-5 shadow-float",
        )}
      >
        <header className="mb-4 flex items-start justify-between gap-3 border-b border-brand-border pb-4">
          <div>
            <h2 className="text-base font-semibold text-brand-text1">{title}</h2>
            {description ? <p className="mt-1 text-sm text-brand-text2">{description}</p> : null}
          </div>
          <button
            className="rounded-md border border-brand-border p-1.5 hover:bg-brand-surface"
            aria-label="Close drawer"
            onClick={() => onOpenChange(false)}
          >
            <Icon icon={X} size={18} color="secondary" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
