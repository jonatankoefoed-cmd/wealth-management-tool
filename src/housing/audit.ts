/**
 * Audit Builder
 * 
 * Helper functions for building consistent audit objects.
 */

import { Audit, AuditInput, AuditStep, AuditOutput } from './types';

let auditCounter = 0;

/**
 * Create an audit object with consistent formatting.
 */
export function makeAudit(params: {
    title: string;
    context: Record<string, unknown>;
    inputs: AuditInput[];
    steps: AuditStep[];
    outputs: AuditOutput[];
    notes?: string[];
}): Audit {
    auditCounter++;

    return {
        auditId: `housing_audit_${auditCounter}_${Date.now()}`,
        title: params.title,
        context: params.context,
        inputs: params.inputs,
        steps: params.steps,
        outputs: params.outputs,
        notes: params.notes ?? [],
    };
}

/**
 * Format a number as DKK currency string.
 */
export function formatDKK(amount: number): string {
    return `${amount.toLocaleString('da-DK')} DKK`;
}

/**
 * Format a rate as percentage string.
 */
export function formatPct(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Create standard amount input.
 */
export function amountInput(label: string, value: number, source?: string): AuditInput {
    return { label, value, unit: 'DKK', source };
}

/**
 * Create standard rate input.
 */
export function rateInput(label: string, value: number, source?: string): AuditInput {
    return { label, value: formatPct(value), unit: '%', source };
}

/**
 * Create calculation step.
 */
export function calcStep(label: string, formula: string, value: number, unit = 'DKK'): AuditStep {
    return { label, formula, value, unit };
}

/**
 * Create output entry.
 */
export function output(label: string, value: number, unit = 'DKK'): AuditOutput {
    return { label, value, unit };
}

/**
 * Reset audit counter (for testing).
 */
export function resetAuditCounter(): void {
    auditCounter = 0;
}
