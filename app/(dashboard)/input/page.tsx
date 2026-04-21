"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

// Components
import { IncomePathTab } from "@/components/input/income-path";
import { BudgetCategoriesTab } from "@/components/input/budget-categories";
import { AllocationTab } from "@/components/input/allocation";
import { HousingPlanTab } from "@/components/input/housing-plan";
import { EventsTab } from "@/components/input/events";
import { AssumptionsTab } from "@/components/input/assumptions";

function AccordionSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden border-brand-border/70 bg-brand-surface shadow-soft transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-6 text-left hover:bg-brand-surface2/50 transition-colors"
      >
        <div className="space-y-1 pr-6">
          <h3 className="text-lg font-semibold tracking-tight text-brand-text1">{title}</h3>
          <p className="text-sm text-brand-text2">{description}</p>
        </div>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-surface2 text-brand-text2 transition-transform duration-200",
            isOpen && "rotate-180 bg-brand-accent/10 text-brand-accent"
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </div>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="border-t border-brand-border/50 bg-brand-surface pt-6 pb-8">
            {children}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

export default function InputPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 animate-fade-in-up pb-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-brand-text1">Assumptions Control Center</h1>
        <p className="text-base text-brand-text2 max-w-3xl">
          Administrer alle grundlæggende variabler, presets og dybdegående indstillinger for din økonomi her. Denne side samler både budget-inputs og langsigtede forudsætninger ét sted.
        </p>
      </div>

      <div className="space-y-4">
        <AccordionSection
          title="Income Path"
          description="Career trajectory and compensation dynamics."
          defaultOpen={true}
        >
          <IncomePathTab />
        </AccordionSection>

        <AccordionSection
          title="Budget Categories"
          description="Detailed monthly cost lines used across the app."
        >
          <BudgetCategoriesTab />
        </AccordionSection>

        <AccordionSection
          title="Allocation Strategy"
          description="How monthly surplus should flow into long-term capital."
        >
          <AllocationTab />
        </AccordionSection>

        <AccordionSection
          title="Housing Plan"
          description="Mortgage, bank loan and operating-cost assumptions."
        >
          <HousingPlanTab />
        </AccordionSection>

        <AccordionSection
          title="Life Events"
          description="One-off events that should affect the forecast."
        >
          <EventsTab />
        </AccordionSection>

        <AccordionSection
          title="Global Assumptions"
          description="Long-range settings that influence the forecast engine."
        >
          <AssumptionsTab />
        </AccordionSection>
      </div>
    </div>
  );
}
