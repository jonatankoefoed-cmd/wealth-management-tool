"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import { formatDKK } from "@/lib/format";

export interface ExplainStep {
  label: string;
  formula?: string;
  value: string | number;
  unit?: string;
}

export interface ExplainAudit {
  title: string;
  context?: Record<string, unknown>;
  steps?: ExplainStep[];
  notes?: string[];
  inputs?: ExplainStep[];
  outputs?: ExplainStep[];
}

interface ExplainDrawerProps {
  audit: ExplainAudit;
  label?: string;
}

function formatAuditValue(value: string | number, unit?: string): string {
  if (unit === "DKK") {
    return formatDKK(value);
  }
  if (typeof value === "number") {
    return `${value}${unit ? ` ${unit}` : ""}`;
  }
  return `${value}${unit ? ` ${unit}` : ""}`;
}

export function AuditContent({ audit }: { audit: ExplainAudit }) {
  return (
    <div className="space-y-4">
      {audit.context && Object.keys(audit.context).length > 0 ? (
        <section className="rounded-md border border-brand-border bg-brand-surface p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-text2">Context</h3>
          <dl className="space-y-1.5 text-sm">
            {Object.entries(audit.context).map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-3">
                <dt className="text-brand-text2">{key}</dt>
                <dd className="text-right text-brand-text1 tabular-nums">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {audit.inputs && audit.inputs.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-text2">Inputs</h3>
          <div className="space-y-2">
            {audit.inputs.map((step, index) => (
              <div key={`${step.label}-${index}`} className="rounded-md border border-brand-border p-3">
                <p className="text-sm font-medium text-brand-text1">{step.label}</p>
                <p className="mt-1 text-sm tabular-nums text-brand-text2">
                  {formatAuditValue(step.value, step.unit)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {audit.steps && audit.steps.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-text2">Steps</h3>
          <div className="space-y-2">
            {audit.steps.map((step, index) => (
              <div key={`${step.label}-${index}`} className="rounded-md border border-brand-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-brand-text1">{step.label}</p>
                  <p className="text-sm tabular-nums text-brand-text1">
                    {formatAuditValue(step.value, step.unit)}
                  </p>
                </div>
                {step.formula ? (
                  <p className="mt-1 text-xs text-brand-text2">Formula: {step.formula}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {audit.outputs && audit.outputs.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-text2">Outputs</h3>
          <div className="space-y-2">
            {audit.outputs.map((step, index) => (
              <div
                key={`${step.label}-${index}`}
                className="rounded-md border border-brand-border bg-brand-surface p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-brand-text1">{step.label}</p>
                  <p className="text-sm tabular-nums text-brand-text1">
                    {formatAuditValue(step.value, step.unit)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {audit.notes && audit.notes.length > 0 ? (
        <section className="rounded-md border border-brand-border bg-brand-surface p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-text2">Notes</h3>
          <ul className="space-y-1 text-sm text-brand-text2">
            {audit.notes.map((note, index) => (
              <li key={`${note}-${index}`}>- {note}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function ExplainDrawer({ audit, label = "Explain" }: ExplainDrawerProps): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon icon={Info} size={16} color="secondary" />
        {label}
      </Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={audit.title}
        description="Calculation details from backend audit payload"
      >
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          <AuditContent audit={audit} />
        </div>
      </Drawer>
    </>
  );
}
