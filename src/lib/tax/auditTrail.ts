/**
 * Audit Trail for Tax Calculations
 * 
 * Provides structured audit trail output for all tax calculations,
 * matching the format defined in TAX_ENGINE.md and CALC_ENGINE.md.
 */

export interface AuditInput {
    label: string;
    value: number;
    unit: string;
    source: string;
}

export interface AuditStep {
    label: string;
    formula: string;
    value: number;
    unit: string;
}

export interface AuditOutput {
    label: string;
    value: number;
    unit: string;
}

export interface TaxAudit {
    title: string;
    timestamp: string;
    context: {
        taxYear: number;
        scenarioId?: string;
        userId?: string;
    };
    inputs: AuditInput[];
    steps: AuditStep[];
    outputs: AuditOutput[];
    notes: string[];
}

export interface CreateAuditParams {
    title: string;
    context: {
        taxYear: number;
        scenarioId?: string;
        userId?: string;
    };
    inputs: AuditInput[];
    steps: AuditStep[];
    outputs: AuditOutput[];
    notes?: string[];
}

/**
 * Create a standardized audit trail for tax calculations.
 */
export function createAudit(params: CreateAuditParams): TaxAudit {
    return {
        title: params.title,
        timestamp: new Date().toISOString(),
        context: params.context,
        inputs: params.inputs,
        steps: params.steps,
        outputs: params.outputs,
        notes: params.notes || [],
    };
}

/**
 * Format an audit trail for display.
 */
export function formatAudit(audit: TaxAudit): string {
    const lines: string[] = [];

    lines.push(`=== ${audit.title} ===`);
    lines.push(`Skatteår: ${audit.context.taxYear}`);
    lines.push(`Beregnet: ${audit.timestamp}`);
    lines.push('');

    lines.push('INPUTS:');
    for (const input of audit.inputs) {
        lines.push(`  ${input.label}: ${formatNumber(input.value)} ${input.unit}`);
    }
    lines.push('');

    lines.push('BEREGNINGSSKRIDT:');
    for (const step of audit.steps) {
        lines.push(`  ${step.label}:`);
        lines.push(`    ${step.formula} = ${formatNumber(step.value)} ${step.unit}`);
    }
    lines.push('');

    lines.push('RESULTAT:');
    for (const output of audit.outputs) {
        lines.push(`  ${output.label}: ${formatNumber(output.value)} ${output.unit}`);
    }

    if (audit.notes.length > 0) {
        lines.push('');
        lines.push('NOTER:');
        for (const note of audit.notes) {
            lines.push(`  • ${note}`);
        }
    }

    return lines.join('\n');
}

/**
 * Format a number for display with thousands separators.
 */
function formatNumber(value: number): string {
    if (value < 1 && value > 0) {
        // Percentage or small decimal
        return (value * 100).toFixed(2);
    }
    return value.toLocaleString('da-DK', { maximumFractionDigits: 2 });
}
