"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { NAV_ITEMS, getNavigationMeta } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
}

function TodayStamp(): string {
  const now = new Date();
  return now.toLocaleDateString("da-DK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const currentMeta = getNavigationMeta(pathname);

  return (
    <div className="relative min-h-screen bg-brand-bg">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(164,176,163,0.12),transparent_55%)]" />
      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden w-[264px] border-r border-brand-border/90 bg-brand-surface/70 px-4 py-6 backdrop-blur lg:flex lg:flex-col">
          <div className="mb-8 px-2">
            <Link href="/" className="inline-flex items-center rounded-md transition-opacity hover:opacity-80">
              <Image
                src="/brand/logo-lockup.svg"
                alt="Wealth Management"
                width={152}
                height={30}
                priority
              />
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all duration-180",
                    active
                      ? "border-brand-accent/60 bg-brand-accent/15 text-brand-text1 shadow-soft"
                      : "border-transparent text-brand-text2 hover:border-brand-border hover:bg-brand-surface2 hover:text-brand-text1",
                  )}
                >
                  <Icon icon={item.icon} size={18} color={active ? "accent" : "secondary"} />
                  <span className="font-medium">{item.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-brand-border/60 px-2 pt-4">
            <p className="text-[11px] font-medium tracking-wide text-brand-text3 uppercase">Wealth Dashboard</p>
            <p className="mt-0.5 text-[11px] text-brand-text3">v1.0 · {new Date().getFullYear()}</p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-20 border-b border-brand-border bg-brand-bg/90 backdrop-blur">
            <div className="mx-auto w-full max-w-[1320px] px-4 py-4 md:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold text-brand-text1 md:text-2xl">
                    {currentMeta.label}
                  </h1>
                  <p className="truncate text-sm text-brand-text2">{currentMeta.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/input" className="hidden md:block">
                    <Button
                      variant="ghost"
                      className="gap-2 rounded-full border border-brand-border/80 bg-brand-surface2 px-4 text-brand-text2 hover:bg-brand-surface hover:text-brand-text1"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      Advanced
                    </Button>
                  </Link>
                  <div className="hidden items-center gap-2 rounded-full border border-brand-border/80 bg-gradient-to-r from-brand-surface2 to-brand-surface px-3.5 py-1.5 text-sm text-brand-text2 shadow-soft md:inline-flex">
                    <Icon icon={CalendarDays} size={16} color="secondary" />
                    <span className="tabular-nums">{TodayStamp()}</span>
                  </div>
                </div>
              </div>
              <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={`mobile-${item.href}`}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                        active
                          ? "border-brand-accent/60 bg-brand-accent/15 text-brand-text1"
                          : "border-brand-border bg-brand-surface2 text-brand-text2",
                      )}
                    >
                      <Icon icon={item.icon} size={16} color={active ? "accent" : "secondary"} />
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/input"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-brand-border bg-brand-surface2 px-3 py-1.5 text-xs font-medium text-brand-text2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Advanced
                </Link>
              </nav>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
