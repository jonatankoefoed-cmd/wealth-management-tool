/**
 * Danish Equity Income Tax Calculator
 * 
 * Calculates tax on equity income (aktieindkomst) including:
 * - Realized capital gains on shares
 * - Dividends
 * - Loss carry-forward deduction
 * 
 * Tax rates 2026:
 * - 27% on first 79.400 kr (158.800 for married couples)
 * - 42% on amounts exceeding the threshold
 */

import { TaxRules, loadTaxRules, getEquityThreshold } from './taxRules';
import { AuditStep, createAudit, TaxAudit } from './auditTrail';

// ============================================================================
// Input Types
// ============================================================================

export interface EquityIncomeInput {
    taxYear: number;
    realizedGains: number;
    dividends: number;
    lossesCarryForwardUsed?: number;
    isMarried?: boolean;
}

// ============================================================================
// Output Types
// ============================================================================

export interface EquityTaxResult {
    totalTax: number;
    effectiveRate: number;

    breakdown: {
        grossEquityIncome: number;
        lossDeduction: number;
        taxableEquityIncome: number;
        threshold: number;
        tier1Base: number;
        tier1Tax: number;
        tier2Base: number;
        tier2Tax: number;
    };

    audit: TaxAudit;
    warnings: string[];
}

// ============================================================================
// Calculator
// ============================================================================

export function calculateEquityTax(input: EquityIncomeInput): EquityTaxResult {
    const rules = loadTaxRules(input.taxYear);
    const steps: AuditStep[] = [];
    const warnings: string[] = [];

    // Get threshold based on marital status
    const threshold = getEquityThreshold(rules, input.isMarried || false);

    // Calculate gross equity income
    const grossEquityIncome = input.realizedGains + input.dividends;

    steps.push({
        label: 'Brutto aktieindkomst',
        formula: `${input.realizedGains} (gevinster) + ${input.dividends} (udbytter)`,
        value: grossEquityIncome,
        unit: 'DKK',
    });

    // Apply loss carry-forward
    const lossDeduction = input.lossesCarryForwardUsed || 0;
    const taxableEquityIncome = Math.max(0, grossEquityIncome - lossDeduction);

    if (lossDeduction > 0) {
        steps.push({
            label: 'Tab fremført modregnet',
            formula: `${grossEquityIncome} - ${lossDeduction}`,
            value: taxableEquityIncome,
            unit: 'DKK',
        });
    }

    // Handle negative total (loss)
    if (taxableEquityIncome <= 0) {
        const audit = createAudit({
            title: 'Aktieindkomstskat',
            context: { taxYear: input.taxYear },
            inputs: [
                { label: 'Realiserede gevinster', value: input.realizedGains, unit: 'DKK', source: 'input' },
                { label: 'Udbytter', value: input.dividends, unit: 'DKK', source: 'input' },
                { label: 'Fremførte tab anvendt', value: lossDeduction, unit: 'DKK', source: 'input' },
            ],
            steps,
            outputs: [
                { label: 'Skat', value: 0, unit: 'DKK' },
            ],
            notes: ['Ingen positiv aktieindkomst. Tab kan fremføres til modregning i fremtidige gevinster.'],
        });

        return {
            totalTax: 0,
            effectiveRate: 0,
            breakdown: {
                grossEquityIncome,
                lossDeduction,
                taxableEquityIncome: 0,
                threshold,
                tier1Base: 0,
                tier1Tax: 0,
                tier2Base: 0,
                tier2Tax: 0,
            },
            audit,
            warnings: ['Negativ aktieindkomst - tab fremføres.'],
        };
    }

    // Calculate tier 1 (under threshold) at 27%
    const tier1Base = Math.min(taxableEquityIncome, threshold);
    const tier1Tax = tier1Base * rules.equityIncome.rateLow;

    steps.push({
        label: 'Trin 1 (27% skat)',
        formula: `min(${taxableEquityIncome}, ${threshold}) × ${rules.equityIncome.rateLow * 100}%`,
        value: tier1Tax,
        unit: 'DKK',
    });

    // Calculate tier 2 (over threshold) at 42%
    const tier2Base = Math.max(0, taxableEquityIncome - threshold);
    const tier2Tax = tier2Base * rules.equityIncome.rateHigh;

    if (tier2Base > 0) {
        steps.push({
            label: 'Trin 2 (42% skat)',
            formula: `max(0, ${taxableEquityIncome} - ${threshold}) × ${rules.equityIncome.rateHigh * 100}%`,
            value: tier2Tax,
            unit: 'DKK',
        });
    }

    // Total
    const totalTax = tier1Tax + tier2Tax;
    const effectiveRate = taxableEquityIncome > 0 ? totalTax / taxableEquityIncome : 0;

    steps.push({
        label: 'Total aktieindkomstskat',
        formula: `${tier1Tax} + ${tier2Tax}`,
        value: totalTax,
        unit: 'DKK',
    });

    steps.push({
        label: 'Effektiv sats',
        formula: `${totalTax} / ${taxableEquityIncome}`,
        value: effectiveRate,
        unit: '%',
    });

    // Build audit
    const notes: string[] = [];
    if (input.isMarried) {
        notes.push(`Ægtepar: Fordoblet progressionsgrænse (${threshold.toLocaleString('da-DK')} kr)`);
    }

    const audit = createAudit({
        title: 'Aktieindkomstskat',
        context: { taxYear: input.taxYear },
        inputs: [
            { label: 'Realiserede gevinster', value: input.realizedGains, unit: 'DKK', source: 'input' },
            { label: 'Udbytter', value: input.dividends, unit: 'DKK', source: 'input' },
            { label: 'Fremførte tab anvendt', value: lossDeduction, unit: 'DKK', source: 'input' },
            { label: 'Gift', value: input.isMarried ? 1 : 0, unit: 'bool', source: 'input' },
        ],
        steps,
        outputs: [
            { label: 'Aktieindkomstskat', value: totalTax, unit: 'DKK' },
            { label: 'Effektiv sats', value: effectiveRate * 100, unit: '%' },
        ],
        notes,
    });

    return {
        totalTax,
        effectiveRate,
        breakdown: {
            grossEquityIncome,
            lossDeduction,
            taxableEquityIncome,
            threshold,
            tier1Base,
            tier1Tax,
            tier2Base,
            tier2Tax,
        },
        audit,
        warnings,
    };
}

/**
 * Calculate the net dividend after Danish withholding tax.
 * Typically 27% withheld at source, applied against final tax.
 */
export function calculateDividendWithholding(
    grossDividend: number,
    rules: TaxRules
): { netDividend: number; withheld: number } {
    const withheld = grossDividend * rules.dividendWithholding.domestic.rate;
    return {
        netDividend: grossDividend - withheld,
        withheld,
    };
}
