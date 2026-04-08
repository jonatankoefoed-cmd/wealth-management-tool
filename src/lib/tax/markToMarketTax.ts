/**
 * Danish Mark-to-Market (Lagerbeskatning) Tax Calculator
 * 
 * Calculates annual tax on mark-to-market products like:
 * - ETFs (on or off SKAT's positive list)
 * - Investment companies (investeringsselskaber)
 * - Certain funds
 * 
 * The tax treatment depends on whether the product is:
 * - On SKAT's positive list → Equity income (aktieindkomst) 27%/42%
 * - NOT on positive list → Capital income (kapitalindkomst)
 */

import { TaxRules, loadTaxRules, IncomeType, TaxationPrinciple, classifyInstrument } from './taxRules';
import { AuditStep, createAudit, TaxAudit } from './auditTrail';
import { calculateEquityTax } from './equityTax';

// ============================================================================
// Input Types
// ============================================================================

export interface MarkToMarketInput {
    taxYear: number;
    holdings: MarkToMarketHolding[];
    isMarried?: boolean;
}

export interface MarkToMarketHolding {
    identifier: string;          // ISIN or ticker
    name: string;
    instrumentType: string;      // Must match rules.instrumentClassification.rules[].type
    openingValue: number;
    closingValue: number;

    // Override automatic classification if needed
    incomeTypeOverride?: IncomeType;
    onSkatsPositivliste?: boolean;
}

// ============================================================================
// Output Types
// ============================================================================

export interface MarkToMarketTaxResult {
    totalTax: number;

    byIncomeType: {
        equityIncome: {
            taxableChange: number;
            tax: number;
        };
        capitalIncome: {
            taxableChange: number;
            tax: number;
        };
    };

    holdingDetails: MarkToMarketHoldingResult[];

    audit: TaxAudit;
    warnings: string[];
}

export interface MarkToMarketHoldingResult {
    identifier: string;
    name: string;
    valueChange: number;
    incomeType: IncomeType;
    taxationPrinciple: TaxationPrinciple;
}

// ============================================================================
// Calculator
// ============================================================================

export function calculateMarkToMarketTax(input: MarkToMarketInput): MarkToMarketTaxResult {
    const rules = loadTaxRules(input.taxYear);
    const steps: AuditStep[] = [];
    const warnings: string[] = [];

    const holdingDetails: MarkToMarketHoldingResult[] = [];
    let equityIncomeTotal = 0;
    let capitalIncomeTotal = 0;

    // -------------------------------------------------------------------------
    // Classify and sum each holding
    // -------------------------------------------------------------------------

    for (const holding of input.holdings) {
        const valueChange = holding.closingValue - holding.openingValue;

        // Determine income type
        let incomeType: IncomeType;
        let taxationPrinciple: TaxationPrinciple = 'LAGER';

        if (holding.incomeTypeOverride) {
            incomeType = holding.incomeTypeOverride;
        } else {
            const classification = classifyInstrument(rules, holding.instrumentType);

            if (classification) {
                incomeType = classification.incomeType;
                taxationPrinciple = classification.taxationPrinciple;
            } else {
                // Default to capital income if unclassified
                incomeType = 'CAPITAL_INCOME';
                warnings.push(`Ukendt instrumenttype "${holding.instrumentType}" for ${holding.name}. Behandlet som kapitalindkomst.`);
            }
        }

        // ETFs on SKAT's list get equity treatment
        if (holding.onSkatsPositivliste === true) {
            incomeType = 'EQUITY_INCOME';
        } else if (holding.onSkatsPositivliste === false) {
            incomeType = 'CAPITAL_INCOME';
        }

        holdingDetails.push({
            identifier: holding.identifier,
            name: holding.name,
            valueChange,
            incomeType,
            taxationPrinciple,
        });

        if (incomeType === 'EQUITY_INCOME') {
            equityIncomeTotal += valueChange;
        } else {
            capitalIncomeTotal += valueChange;
        }
    }

    steps.push({
        label: 'Lagergevinst som aktieindkomst',
        formula: `Sum af værdistigninger for instrumenter på SKATs positivliste`,
        value: equityIncomeTotal,
        unit: 'DKK',
    });

    steps.push({
        label: 'Lagergevinst som kapitalindkomst',
        formula: `Sum af værdistigninger for instrumenter IKKE på SKATs positivliste`,
        value: capitalIncomeTotal,
        unit: 'DKK',
    });

    // -------------------------------------------------------------------------
    // Calculate tax for equity income portion
    // -------------------------------------------------------------------------

    let equityTax = 0;
    if (equityIncomeTotal > 0) {
        const equityResult = calculateEquityTax({
            taxYear: input.taxYear,
            realizedGains: equityIncomeTotal, // Treated as gains for tax purposes
            dividends: 0,
            isMarried: input.isMarried,
        });
        equityTax = equityResult.totalTax;

        steps.push({
            label: 'Skat af lager som aktieindkomst',
            formula: `Progressiv skat (27%/42%)`,
            value: equityTax,
            unit: 'DKK',
        });
    } else if (equityIncomeTotal < 0) {
        warnings.push('Negativt lagerbeskattet aktieindkomst - tab kan modregnes i aktieindkomst.');
    }

    // -------------------------------------------------------------------------
    // Calculate tax for capital income portion
    // -------------------------------------------------------------------------

    let capitalTax = 0;
    if (capitalIncomeTotal > 0) {
        // Capital income is taxed as part of personal income
        // For MVP, we use an approximate effective rate
        // Full integration with personal tax base comes in later version
        const effectiveCapitalRate = rules.personal.taxCeilings.capitalIncome;
        capitalTax = capitalIncomeTotal * effectiveCapitalRate;

        steps.push({
            label: 'Skat af lager som kapitalindkomst',
            formula: `${capitalIncomeTotal} × ${effectiveCapitalRate * 100}% (skatteloft)`,
            value: capitalTax,
            unit: 'DKK',
        });

        warnings.push('Kapitalindkomst beregnet med skatteloft. Faktisk skat afhænger af samlet personlig indkomst.');
    } else if (capitalIncomeTotal < 0) {
        // Negative capital income has deduction value
        const deductionRate = Math.abs(capitalIncomeTotal) <= rules.capitalIncome.negative.fullDeductionLimit
            ? rules.capitalIncome.negative.fullDeductionRate
            : rules.capitalIncome.negative.reducedDeductionRate;

        capitalTax = capitalIncomeTotal * deductionRate; // Will be negative (a credit)

        steps.push({
            label: 'Fradragsværdi af negativ kapitalindkomst',
            formula: `${capitalIncomeTotal} × ${deductionRate * 100}%`,
            value: capitalTax,
            unit: 'DKK',
        });
    }

    const totalTax = equityTax + Math.max(0, capitalTax);

    steps.push({
        label: 'Total lagerbeskatning',
        formula: `${equityTax} + ${Math.max(0, capitalTax)}`,
        value: totalTax,
        unit: 'DKK',
    });

    // -------------------------------------------------------------------------
    // Build audit
    // -------------------------------------------------------------------------

    const notes: string[] = [];
    notes.push(`${holdingDetails.filter(h => h.incomeType === 'EQUITY_INCOME').length} instrumenter behandlet som aktieindkomst`);
    notes.push(`${holdingDetails.filter(h => h.incomeType === 'CAPITAL_INCOME').length} instrumenter behandlet som kapitalindkomst`);

    const audit = createAudit({
        title: 'Lagerbeskatning',
        context: { taxYear: input.taxYear },
        inputs: input.holdings.map(h => ({
            label: h.name,
            value: h.closingValue - h.openingValue,
            unit: 'DKK',
            source: 'holding',
        })),
        steps,
        outputs: [
            { label: 'Aktieindkomst skat', value: equityTax, unit: 'DKK' },
            { label: 'Kapitalindkomst skat', value: Math.max(0, capitalTax), unit: 'DKK' },
            { label: 'Total', value: totalTax, unit: 'DKK' },
        ],
        notes,
    });

    return {
        totalTax,
        byIncomeType: {
            equityIncome: {
                taxableChange: equityIncomeTotal,
                tax: equityTax,
            },
            capitalIncome: {
                taxableChange: capitalIncomeTotal,
                tax: Math.max(0, capitalTax),
            },
        },
        holdingDetails,
        audit,
        warnings,
    };
}
