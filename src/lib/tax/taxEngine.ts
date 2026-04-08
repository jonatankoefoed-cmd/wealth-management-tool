/**
 * Danish Tax Engine
 * 
 * Main entry point for calculating all Danish taxes.
 * Aggregates personal income tax, equity income tax, ASK tax, and mark-to-market tax.
 * 
 * This engine:
 * - Is deterministic and pure (no DB reads inside engine)
 * - Uses rule files for all rates and thresholds
 * - Produces auditable output with calculation steps
 */

import { TaxRules, loadTaxRules } from './taxRules';
import { TaxAudit, createAudit } from './auditTrail';
import { PersonalIncomeInput, PersonalTaxResult, calculatePersonalTax } from './personalTax';
import { EquityIncomeInput, EquityTaxResult, calculateEquityTax } from './equityTax';
import { ASKInput, ASKTaxResult, calculateASKTax } from './askTax';
import { MarkToMarketInput, MarkToMarketTaxResult, calculateMarkToMarketTax } from './markToMarketTax';

// ============================================================================
// Main Input Type
// ============================================================================

export interface TaxInput {
    taxYear: number;

    // Municipality info
    municipality: {
        rate: number;           // e.g., 0.25 for 25%
        churchRate?: number;    // e.g., 0.007 for 0.7%
    };

    // Personal income (optional if only investment income)
    personalIncome?: Omit<PersonalIncomeInput, 'taxYear' | 'municipalRate' | 'churchRate'>;

    // Investment income
    investments?: {
        // Realized gains and dividends (realization principle)
        equityIncome?: Omit<EquityIncomeInput, 'taxYear' | 'isMarried'>;

        // Mark-to-market holdings
        markToMarket?: Omit<MarkToMarketInput, 'taxYear' | 'isMarried'>;

        // Aktiesparekonto
        ask?: Omit<ASKInput, 'taxYear'>;

        // Net capital income (simplified for MVP)
        netCapitalIncome?: number;
    };

    // Household status
    isMarried?: boolean;
}

// ============================================================================
// Main Output Type
// ============================================================================

export interface TaxOutput {
    taxYear: number;

    // Summary totals
    totals: {
        totalTax: number;
        personalTaxTotal: number;
        equityTaxTotal: number;
        capitalTaxTotal: number;
        askTaxTotal: number;
        markToMarketTaxTotal: number;
    };

    // Detailed breakdowns
    breakdown: {
        personal?: PersonalTaxResult;
        equity?: EquityTaxResult;
        ask?: ASKTaxResult;
        markToMarket?: MarkToMarketTaxResult;
        capital?: {
            netCapitalIncome: number;
            tax: number;
            note: string;
        };
    };

    // Audit trail
    summaryAudit: TaxAudit;

    // Warnings and assumptions
    warnings: string[];
    assumptions: string[];
}

// ============================================================================
// Main Calculator
// ============================================================================

export function calculateTax(input: TaxInput): TaxOutput {
    const rules = loadTaxRules(input.taxYear);
    const warnings: string[] = [];
    const assumptions: string[] = [];

    let personalTaxTotal = 0;
    let equityTaxTotal = 0;
    let capitalTaxTotal = 0;
    let askTaxTotal = 0;
    let markToMarketTaxTotal = 0;

    const breakdown: TaxOutput['breakdown'] = {};

    // -------------------------------------------------------------------------
    // 1. Personal Income Tax
    // -------------------------------------------------------------------------

    if (input.personalIncome) {
        const personalResult = calculatePersonalTax({
            taxYear: input.taxYear,
            municipalRate: input.municipality.rate,
            churchRate: input.municipality.churchRate,
            isMarried: input.isMarried,
            ...input.personalIncome,
        });

        breakdown.personal = personalResult;
        personalTaxTotal = personalResult.totalTax;
        warnings.push(...personalResult.warnings);
        assumptions.push(...personalResult.assumptions);
    }

    // -------------------------------------------------------------------------
    // 2. Equity Income Tax (realized gains + dividends)
    // -------------------------------------------------------------------------

    if (input.investments?.equityIncome) {
        const equityResult = calculateEquityTax({
            taxYear: input.taxYear,
            isMarried: input.isMarried,
            ...input.investments.equityIncome,
        });

        breakdown.equity = equityResult;
        equityTaxTotal = equityResult.totalTax;
        warnings.push(...equityResult.warnings);
    }

    // -------------------------------------------------------------------------
    // 3. Mark-to-Market Tax (lagerbeskatning)
    // -------------------------------------------------------------------------

    if (input.investments?.markToMarket?.holdings?.length) {
        const markToMarketResult = calculateMarkToMarketTax({
            taxYear: input.taxYear,
            isMarried: input.isMarried,
            ...input.investments.markToMarket,
        });

        breakdown.markToMarket = markToMarketResult;
        markToMarketTaxTotal = markToMarketResult.totalTax;

        // Add equity portion to equity total
        equityTaxTotal += markToMarketResult.byIncomeType.equityIncome.tax;

        // Capital income portion
        capitalTaxTotal += markToMarketResult.byIncomeType.capitalIncome.tax;

        warnings.push(...markToMarketResult.warnings);
    }

    // -------------------------------------------------------------------------
    // 4. ASK Tax
    // -------------------------------------------------------------------------

    if (input.investments?.ask) {
        const askResult = calculateASKTax({
            taxYear: input.taxYear,
            ...input.investments.ask,
        });

        breakdown.ask = askResult;
        askTaxTotal = askResult.tax;
        warnings.push(...askResult.warnings);
    }

    // -------------------------------------------------------------------------
    // 5. Net Capital Income (MVP placeholder)
    // -------------------------------------------------------------------------

    if (input.investments?.netCapitalIncome !== undefined) {
        const netCapitalIncome = input.investments.netCapitalIncome;

        // MVP: Just note that capital income affects personal tax base
        // Full integration comes in later version
        breakdown.capital = {
            netCapitalIncome,
            tax: 0, // Not separately calculated - affects personal tax base
            note: 'Kapitalindkomst er inkluderet i beregningen via effekten på personskat.',
        };

        if (netCapitalIncome !== 0) {
            assumptions.push('Kapitalindkomst integration med personskat base er forenklet i MVP.');
        }
    }

    // -------------------------------------------------------------------------
    // Calculate total
    // -------------------------------------------------------------------------

    const totalTax = personalTaxTotal + equityTaxTotal + capitalTaxTotal + askTaxTotal;

    // -------------------------------------------------------------------------
    // Build summary audit
    // -------------------------------------------------------------------------

    const summaryAudit = createAudit({
        title: 'Samlet skatteberegning',
        context: { taxYear: input.taxYear },
        inputs: [
            { label: 'Skatteår', value: input.taxYear, unit: '', source: 'input' },
            { label: 'Kommuneskat', value: input.municipality.rate * 100, unit: '%', source: 'input' },
        ],
        steps: [
            { label: 'Personskat', formula: 'Se detaljer', value: personalTaxTotal, unit: 'DKK' },
            { label: 'Aktieindkomstskat', formula: 'Se detaljer', value: equityTaxTotal, unit: 'DKK' },
            { label: 'Kapitalindkomstskat', formula: 'Se detaljer', value: capitalTaxTotal, unit: 'DKK' },
            { label: 'ASK skat', formula: 'Se detaljer', value: askTaxTotal, unit: 'DKK' },
        ],
        outputs: [
            { label: 'Total årlig skat', value: totalTax, unit: 'DKK' },
        ],
        notes: assumptions,
    });

    return {
        taxYear: input.taxYear,
        totals: {
            totalTax,
            personalTaxTotal,
            equityTaxTotal,
            capitalTaxTotal,
            askTaxTotal,
            markToMarketTaxTotal,
        },
        breakdown,
        summaryAudit,
        warnings,
        assumptions,
    };
}

// ============================================================================
// Re-exports
// ============================================================================

export { loadTaxRules } from './taxRules';
export type { TaxRules } from './taxRules';

export { calculatePersonalTax } from './personalTax';
export type { PersonalIncomeInput, PersonalTaxResult } from './personalTax';

export { calculateEquityTax } from './equityTax';
export type { EquityIncomeInput, EquityTaxResult } from './equityTax';

export { calculateASKTax, getASKDepositCapacity } from './askTax';
export type { ASKInput, ASKTaxResult } from './askTax';

export { calculateMarkToMarketTax } from './markToMarketTax';
export type { MarkToMarketInput, MarkToMarketTaxResult } from './markToMarketTax';

export { calculateAverageCost, addPurchase, calculateSale } from './costBasis';
export type { Position, SaleCalculation } from './costBasis';

export { formatAudit } from './auditTrail';
export type { TaxAudit } from './auditTrail';
