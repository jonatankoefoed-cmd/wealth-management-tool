/**
 * Danish Tax Rules 2026
 * 
 * Type definitions and loader for tax rule files.
 * Rules are loaded from JSON and provide all tax rates, thresholds and classification rules.
 */

// ============================================================================
// Tax Rule Types
// ============================================================================

export interface TaxRules {
    meta: TaxRulesMeta;
    amContribution: AMContribution;
    personal: PersonalTaxRules;
    capitalIncome: CapitalIncomeRules;
    equityIncome: EquityIncomeRules;
    ask: ASKRules;
    pal: PALRules;
    corporate: CorporateTaxRules;
    markToMarket: MarkToMarketRules;
    instrumentClassification: InstrumentClassificationRules;
    dividendWithholding: DividendWithholdingRules;
    costBasisMethod: CostBasisMethod;
    lossCarryForward: LossCarryForwardRules;
    defaultMunicipalRates: DefaultMunicipalRates;
}

export interface TaxRulesMeta {
    taxYear: number;
    version: string;
    lastUpdated: string;
    sources: string[];
}

export interface AMContribution {
    rate: number;
    description: string;
}

export interface PersonalTaxRules {
    personalAllowance: number;
    personalAllowanceDescription: string;
    employmentDeduction: {
        rate: number;
        maxAmount: number;
        description: string;
    };
    seniorEmploymentDeduction: {
        rate: number;
        maxAmount: number;
        description: string;
    };
    jobDeduction: {
        amount: number;
        description: string;
    };
    bottomTax: {
        rate: number;
        description: string;
    };
    middleTax: {
        rate: number;
        threshold: number;
        thresholdBeforeAM: number;
        description: string;
    };
    topTax: {
        rate: number;
        threshold: number;
        thresholdBeforeAM: number;
        description: string;
    };
    topTopTax: {
        rate: number;
        threshold: number;
        thresholdBeforeAM: number;
        description: string;
    };
    taxCeilings: {
        bottomAndMiddle: number;
        withTopTax: number;
        withTopTopTax: number;
        capitalIncome: number;
        description: string;
    };
}

export interface CapitalIncomeRules {
    positive: {
        allowanceForTopTax: number;
        allowanceForTopTaxMarried: number;
        description: string;
    };
    negative: {
        fullDeductionLimit: number;
        fullDeductionLimitMarried: number;
        fullDeductionRate: number;
        reducedDeductionRate: number;
        description: string;
    };
    model: string;
    notes: string;
}

export interface EquityIncomeRules {
    threshold: number;
    thresholdMarried: number;
    rateLow: number;
    rateHigh: number;
    description: string;
}

export interface ASKRules {
    rate: number;
    depositCap: number;
    taxationPrinciple: 'LAGER';
    description: string;
}

export interface PALRules {
    rate: number;
    taxationPrinciple: 'LAGER';
    description: string;
}

export interface CorporateTaxRules {
    rate: number;
    description: string;
}

export interface MarkToMarketRules {
    classification: {
        skatsPositivliste: {
            equityBased: {
                incomeType: IncomeType;
                taxationPrinciple: TaxationPrinciple;
                description: string;
            };
        };
        notOnPositivliste: {
            default: {
                incomeType: IncomeType;
                taxationPrinciple: TaxationPrinciple;
                description: string;
            };
        };
        udloddendeInvesteringsforeninger: {
            incomeType: IncomeType;
            taxationPrinciple: TaxationPrinciple;
            description: string;
        };
    };
    defaultTreatment: IncomeType;
    notes: string;
}

export interface InstrumentClassificationRules {
    rules: InstrumentClassificationRule[];
}

export interface InstrumentClassificationRule {
    type: string;
    incomeType: IncomeType;
    taxationPrinciple: TaxationPrinciple;
}

export interface DividendWithholdingRules {
    domestic: {
        rate: number;
        description: string;
    };
    foreign: {
        usWithTreaty: {
            rate: number;
            requiresForm: string;
            description: string;
        };
        defaultWithholding: {
            notes: string;
        };
    };
    creditMethod: string;
}

export interface CostBasisMethod {
    primary: 'AVERAGE_COST' | 'FIFO';
    description: string;
    fifoException: string;
    notes: string;
}

export interface LossCarryForwardRules {
    equityIncome: {
        allowedAgainst: string;
        expiryYears: number | null;
        description: string;
    };
    askLosses: {
        allowedAgainst: string;
        notes: string;
    };
    reportingDeadline: {
        date: string;
        description: string;
    };
}

export interface DefaultMunicipalRates {
    averageMunicipalRate: number;
    averageChurchRate: number;
    notes: string;
}

// ============================================================================
// Enums
// ============================================================================

export type IncomeType = 'EQUITY_INCOME' | 'CAPITAL_INCOME';
export type TaxationPrinciple = 'LAGER' | 'REALISATION';
export type WrapperType = 'DEPOT' | 'ASK' | 'PENSION';

// ============================================================================
// Rule Loader
// ============================================================================

import rules2026 from '../../../specs/tax/rules_2026.json';

const rulesCache: Map<number, TaxRules> = new Map();

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecord(root: Record<string, unknown>, key: string, errors: string[]): Record<string, unknown> {
    const value = root[key];
    if (!isRecord(value)) {
        errors.push(`${key} must be an object.`);
        return {};
    }
    return value;
}

function readNumber(root: Record<string, unknown>, key: string, errors: string[], opts?: { min?: number; max?: number }): number {
    const value = root[key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push(`${key} must be a number.`);
        return 0;
    }
    if (opts?.min !== undefined && value < opts.min) {
        errors.push(`${key} must be >= ${opts.min}.`);
    }
    if (opts?.max !== undefined && value > opts.max) {
        errors.push(`${key} must be <= ${opts.max}.`);
    }
    return value;
}

function readString(root: Record<string, unknown>, key: string, errors: string[]): string {
    const value = root[key];
    if (typeof value !== 'string' || value.length === 0) {
        errors.push(`${key} must be a non-empty string.`);
        return '';
    }
    return value;
}

function readArray(root: Record<string, unknown>, key: string, errors: string[]): unknown[] {
    const value = root[key];
    if (!Array.isArray(value)) {
        errors.push(`${key} must be an array.`);
        return [];
    }
    return value;
}

export function validateTaxRulesShape(candidate: unknown): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!isRecord(candidate)) {
        return { ok: false, errors: ['Tax rules must be an object.'] };
    }

    const meta = readRecord(candidate, 'meta', errors);
    readNumber(meta, 'taxYear', errors, { min: 2000 });
    readString(meta, 'version', errors);
    readString(meta, 'lastUpdated', errors);
    readArray(meta, 'sources', errors);

    const am = readRecord(candidate, 'amContribution', errors);
    readNumber(am, 'rate', errors, { min: 0, max: 1 });

    const personal = readRecord(candidate, 'personal', errors);
    readNumber(personal, 'personalAllowance', errors, { min: 0 });
    readRecord(personal, 'employmentDeduction', errors);
    readRecord(personal, 'seniorEmploymentDeduction', errors);
    readRecord(personal, 'jobDeduction', errors);

    const bottomTax = readRecord(personal, 'bottomTax', errors);
    readNumber(bottomTax, 'rate', errors, { min: 0, max: 1 });

    const middleTax = readRecord(personal, 'middleTax', errors);
    readNumber(middleTax, 'rate', errors, { min: 0, max: 1 });
    readNumber(middleTax, 'threshold', errors, { min: 0 });

    const topTax = readRecord(personal, 'topTax', errors);
    readNumber(topTax, 'rate', errors, { min: 0, max: 1 });
    readNumber(topTax, 'threshold', errors, { min: 0 });

    const topTopTax = readRecord(personal, 'topTopTax', errors);
    readNumber(topTopTax, 'rate', errors, { min: 0, max: 1 });
    readNumber(topTopTax, 'threshold', errors, { min: 0 });

    const ceilings = readRecord(personal, 'taxCeilings', errors);
    readNumber(ceilings, 'capitalIncome', errors, { min: 0, max: 1 });

    const capitalIncome = readRecord(candidate, 'capitalIncome', errors);
    readRecord(capitalIncome, 'positive', errors);
    readRecord(capitalIncome, 'negative', errors);
    readString(capitalIncome, 'model', errors);

    const equity = readRecord(candidate, 'equityIncome', errors);
    readNumber(equity, 'threshold', errors, { min: 0 });
    readNumber(equity, 'thresholdMarried', errors, { min: 0 });
    readNumber(equity, 'rateLow', errors, { min: 0, max: 1 });
    readNumber(equity, 'rateHigh', errors, { min: 0, max: 1 });

    const ask = readRecord(candidate, 'ask', errors);
    readNumber(ask, 'rate', errors, { min: 0, max: 1 });
    readNumber(ask, 'depositCap', errors, { min: 0 });
    const askPrinciple = readString(ask, 'taxationPrinciple', errors);
    if (askPrinciple && askPrinciple !== 'LAGER') {
        errors.push('ask.taxationPrinciple must be LAGER.');
    }

    const markToMarket = readRecord(candidate, 'markToMarket', errors);
    const defaultTreatment = readString(markToMarket, 'defaultTreatment', errors);
    if (defaultTreatment && defaultTreatment !== 'EQUITY_INCOME' && defaultTreatment !== 'CAPITAL_INCOME') {
        errors.push('markToMarket.defaultTreatment must be EQUITY_INCOME or CAPITAL_INCOME.');
    }

    const instrumentClassification = readRecord(candidate, 'instrumentClassification', errors);
    const rules = readArray(instrumentClassification, 'rules', errors);
    for (let index = 0; index < rules.length; index += 1) {
        const rule = rules[index];
        if (!isRecord(rule)) {
            errors.push(`instrumentClassification.rules[${index}] must be an object.`);
            continue;
        }
        readString(rule, 'type', errors);
        const incomeType = readString(rule, 'incomeType', errors);
        if (incomeType && incomeType !== 'EQUITY_INCOME' && incomeType !== 'CAPITAL_INCOME') {
            errors.push(`instrumentClassification.rules[${index}].incomeType must be EQUITY_INCOME or CAPITAL_INCOME.`);
        }
        const taxationPrinciple = readString(rule, 'taxationPrinciple', errors);
        if (taxationPrinciple && taxationPrinciple !== 'LAGER' && taxationPrinciple !== 'REALISATION') {
            errors.push(`instrumentClassification.rules[${index}].taxationPrinciple must be LAGER or REALISATION.`);
        }
    }

    return { ok: errors.length === 0, errors };
}

/**
 * Load tax rules for a specific year.
 * Rules are cached after first load.
 */
export function loadTaxRules(taxYear: number): TaxRules {
    if (rulesCache.has(taxYear)) {
        return rulesCache.get(taxYear)!;
    }

    let rules: TaxRules;

    if (taxYear >= 2026) {
        rules = rules2026 as unknown as TaxRules;
    } else {
        throw new Error(`Tax rules not available for year ${taxYear}. Available: 2026`);
    }

    const validation = validateTaxRulesShape(rules);
    if (!validation.ok) {
        throw new Error(
            `Invalid tax rules for year ${taxYear}:\n${validation.errors.map((item) => `- ${item}`).join('\n')}`,
        );
    }

    rulesCache.set(taxYear, rules);
    return rules;
}

/**
 * Get the equity income threshold based on marital status.
 */
export function getEquityThreshold(rules: TaxRules, isMarried: boolean): number {
    return isMarried ? rules.equityIncome.thresholdMarried : rules.equityIncome.threshold;
}

/**
 * Classify an instrument for tax purposes.
 */
export function classifyInstrument(
    rules: TaxRules,
    instrumentType: string
): { incomeType: IncomeType; taxationPrinciple: TaxationPrinciple } | null {
    const classification = rules.instrumentClassification.rules.find(
        (r) => r.type === instrumentType
    );

    if (!classification) {
        return null;
    }

    return {
        incomeType: classification.incomeType,
        taxationPrinciple: classification.taxationPrinciple,
    };
}
