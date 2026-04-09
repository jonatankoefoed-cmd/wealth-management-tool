"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IncomePathTab } from "@/components/input/income-path";
import { BudgetCategoriesTab } from "@/components/input/budget-categories";
import { AllocationTab } from "@/components/input/allocation";
import { HousingPlanTab } from "@/components/input/housing-plan";
import { EventsTab } from "@/components/input/events";
import { AssumptionsTab } from "@/components/input/assumptions";

export default function InputPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-text1">Advanced assumptions</h1>
        <p className="text-sm leading-6 text-brand-text2">
          The main product now lives in Overview, Budget and Portfolio. This page holds the deeper settings that still
          feed the same model, but should not dominate the day-to-day workflow.
        </p>
      </div>

      <Tabs defaultValue="core" className="space-y-6">
        <TabsList className="h-auto rounded-full bg-brand-surface2 p-1">
          <TabsTrigger value="core" className="rounded-full px-4 py-2 text-sm">
            Core assumptions
          </TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-full px-4 py-2 text-sm">
            Advanced assumptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="core" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Income path</CardTitle>
              <CardDescription>Career trajectory and compensation dynamics.</CardDescription>
            </CardHeader>
            <CardContent>
              <IncomePathTab />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget categories</CardTitle>
              <CardDescription>Detailed monthly cost lines used across the app.</CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetCategoriesTab />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allocation strategy</CardTitle>
              <CardDescription>How monthly surplus should flow into long-term capital.</CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Housing plan</CardTitle>
              <CardDescription>Mortgage, bank loan and operating-cost assumptions.</CardDescription>
            </CardHeader>
            <CardContent>
              <HousingPlanTab />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Life events</CardTitle>
              <CardDescription>One-off events that should affect the forecast.</CardDescription>
            </CardHeader>
            <CardContent>
              <EventsTab />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Global assumptions</CardTitle>
              <CardDescription>Long-range settings that influence the forecast engine.</CardDescription>
            </CardHeader>
            <CardContent>
              <AssumptionsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
