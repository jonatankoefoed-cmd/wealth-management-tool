/**
 * Danish ASK (Aktiesparekonto) Tax Calculator
 * 
 * Calculates tax on Aktiesparekonto returns.
 * ASK uses mark-to-market (lagerbeskatning) at a flat 17% rate.
 * 
 * Formula:
 *   Return = Closing Value - Opening Value - Net Deposits + Net Withdrawals
 *   Tax = max(0, Return) × 17%
 * 
 * Notes:
 * - Losses can be carried forward within ASK
 * - 2026 deposit cap: 174.200 kr
 */

import { loadTaxRules } from './taxRules';
import { AuditStep, createAudit, TaxAudit } from './auditTrail';

// ============================================================================
// Input Types
// ============================================================================

export interface ASKInput {
    taxYear: number;
    openingValue: number;
    closingValue: number;
    netDeposits: number;      // Total deposits during year
    netWithdrawals: number;   // Total withdrawals during year
    lossCarryForward?: number; // Losses carried forward from previous years
}

// ============================================================================
// Output Types
// ============================================================================

export interface ASKTaxResult {
    taxableReturn: number;
    tax: number;
    effectiveRate: number;
    lossToCarryForward: number;

    breakdown: {
        openingValue: number;
        closingValue: number;
        netDeposits: number;
        netWithdrawals: number;
        rawReturn: number;
        lossOffset: number;
        taxableReturnBeforeLoss: number;
    };

    audit: TaxAudit;
    warnings: string[];
}

// ============================================================================
// Calculator
// ============================================================================

export function calculateASKTax(input: ASKInput): ASKTaxResult {
    const rules = loadTaxRules(input.taxYear);
    const steps: AuditStep[] = [];
    const warnings: string[] = [];

    // -------------------------------------------------------------------------
    // Calculate return
    // -------------------------------------------------------------------------

    // Afkast = Slutværdi - Startværdi - Nettoindskud + Nettoudtræk
    const rawReturn = input.closingValue - input.openingValue - input.netDeposits + input.netWithdrawals;

    steps.push({
        label: 'Beregn afkast',
        formula: `${input.closingValue} - ${input.openingValue} - ${input.netDeposits} + ${input.netWithdrawals}`,
        value: rawReturn,
        unit: 'DKK',
    });

    // Apply loss carry-forward
    const lossCarryForward = input.lossCarryForward || 0;
    let lossOffset = 0;
    let taxableReturn = rawReturn;
    let newLossCarryForward = 0;

    if (rawReturn > 0 && lossCarryForward > 0) {
        // Offset positive return with carried losses
        lossOffset = Math.min(rawReturn, lossCarryForward);
        taxableReturn = rawReturn - lossOffset;
        newLossCarryForward = lossCarryForward - lossOffset;

        steps.push({
            label: 'Modregning af fremførte tab',
            formula: `${rawReturn} - ${lossOffset}`,
            value: taxableReturn,
            unit: 'DKK',
        });
    } else if (rawReturn < 0) {
        // Negative return: no tax, carry forward the loss
        taxableReturn = 0;
        newLossCarryForward = lossCarryForward + Math.abs(rawReturn);

        warnings.push('Negativt afkast - tab fremføres til modregning i fremtidige år.');

        steps.push({
            label: 'Tab til fremførsel',
            formula: `${lossCarryForward} + ${Math.abs(rawReturn)}`,
            value: newLossCarryForward,
            unit: 'DKK',
        });
    } else if (lossCarryForward > 0) {
        // No gain, preserve existing losses
        newLossCarryForward = lossCarryForward;
    }

    // -------------------------------------------------------------------------
    // Calculate tax
    // -------------------------------------------------------------------------

    const tax = taxableReturn > 0 ? taxableReturn * rules.ask.rate : 0;
    const effectiveRate = rawReturn > 0 ? tax / rawReturn : 0;

    steps.push({
        label: 'ASK skat (17%)',
        formula: `max(0, ${taxableReturn}) × ${rules.ask.rate * 100}%`,
        value: tax,
        unit: 'DKK',
    });

    // -------------------------------------------------------------------------
    // Check deposit cap
    // -------------------------------------------------------------------------

    const totalDeposited = input.openingValue + input.netDeposits;
    if (totalDeposited > rules.ask.depositCap) {
        warnings.push(`Samlet indskud (${totalDeposited.toLocaleString('da-DK')} kr) overstiger loftet på ${rules.ask.depositCap.toLocaleString('da-DK')} kr.`);
    }

    // -------------------------------------------------------------------------
    // Build audit
    // -------------------------------------------------------------------------

    const notes: string[] = [];
    notes.push(`Indskudsloft ${input.taxYear}: ${rules.ask.depositCap.toLocaleString('da-DK')} kr`);

    if (newLossCarryForward > 0) {
        notes.push(`Tab fremført til næste år: ${newLossCarryForward.toLocaleString('da-DK')} kr`);
    }

    const audit = createAudit({
        title: 'Aktiesparekonto (ASK) skat',
        context: { taxYear: input.taxYear },
        inputs: [
            { label: 'Startværdi', value: input.openingValue, unit: 'DKK', source: 'input' },
            { label: 'Slutværdi', value: input.closingValue, unit: 'DKK', source: 'input' },
            { label: 'Nettoindskud', value: input.netDeposits, unit: 'DKK', source: 'input' },
            { label: 'Nettoudtræk', value: input.netWithdrawals, unit: 'DKK', source: 'input' },
            { label: 'Fremførte tab', value: lossCarryForward, unit: 'DKK', source: 'input' },
        ],
        steps,
        outputs: [
            { label: 'Skattepligtigt afkast', value: taxableReturn, unit: 'DKK' },
            { label: 'ASK skat', value: tax, unit: 'DKK' },
            { label: 'Tab til fremførsel', value: newLossCarryForward, unit: 'DKK' },
        ],
        notes,
    });

    return {
        taxableReturn,
        tax,
        effectiveRate,
        lossToCarryForward: newLossCarryForward,
        breakdown: {
            openingValue: input.openingValue,
            closingValue: input.closingValue,
            netDeposits: input.netDeposits,
            netWithdrawals: input.netWithdrawals,
            rawReturn,
            lossOffset,
            taxableReturnBeforeLoss: rawReturn,
        },
        audit,
        warnings,
    };
}

/**
 * Calculate remaining ASK deposit capacity.
 */
export function getASKDepositCapacity(
    taxYear: number,
    currentValue: number
): { cap: number; remaining: number } {
    const rules = loadTaxRules(taxYear);
    const remaining = Math.max(0, rules.ask.depositCap - currentValue);
    return {
        cap: rules.ask.depositCap,
        remaining,
    };
}
