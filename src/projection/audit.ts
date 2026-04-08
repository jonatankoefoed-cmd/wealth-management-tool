/**
 * Projection Audit Builder
 * 
 * Helper functions for building projection audit objects.
 */

import { Audit } from './types';

let auditCounter = 0;

/**
 * Create an audit object for projection events.
 */
export function makeProjectionAudit(params: {
    title: string;
    month: string;
    context?: Record<string, unknown>;
    inputs: Array<{ label: string; value: number | string; unit?: string; source?: string }>;
    steps: Array<{ label: string; formula: string; value: number | string; unit?: string }>;
    outputs: Array<{ label: string; value: number | string; unit?: string }>;
    notes?: string[];
}): Audit {
    auditCounter++;

    return {
        auditId: `projection_audit_${auditCounter}_${Date.now()}`,
        title: params.title,
        context: { month: params.month, ...params.context },
        inputs: params.inputs,
        steps: params.steps,
        outputs: params.outputs,
        notes: params.notes ?? [],
    };
}

/**
 * Reset audit counter (for testing).
 */
export function resetProjectionAuditCounter(): void {
    auditCounter = 0;
}

/**
 * Format amount with DKK unit.
 */
export function dkkInput(label: string, value: number, source?: string) {
    return { label, value, unit: 'DKK', source };
}

/**
 * Format calculation step.
 */
export function stepCalc(label: string, formula: string, value: number, unit = 'DKK') {
    return { label, formula, value, unit };
}

/**
 * Format output.
 */
export function stepOutput(label: string, value: number, unit = 'DKK') {
    return { label, value, unit };
}
