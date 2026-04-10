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
}: DrawerProps) {
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      <section
        className={cn(
          "relative flex h-full w-full max-w-5xl flex-col border-l border-brand-border bg-brand-surface shadow-2xl transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex-none flex items-start justify-between gap-4 border-b border-brand-border p-5 bg-brand-surface sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-brand-text1">{title}</h2>
            {description ? <p className="mt-1 text-xs text-brand-text2 leading-relaxed max-w-md">{description}</p> : null}
          </div>
          <button
            className="rounded-full border border-brand-border p-2 text-brand-text2 hover:bg-brand-surface2 hover:text-brand-text1 transition-colors"
            aria-label="Close drawer"
            onClick={() => onOpenChange(false)}
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {children}
        </div>
      </section>
    </div>
  );
}
