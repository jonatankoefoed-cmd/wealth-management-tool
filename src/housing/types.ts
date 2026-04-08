/**
 * Housing Simulation Types
 * 
 * Types for home purchase simulation matching HOME_PURCHASE_SIMULATION.md.
 */

// ============================================================
// INPUT TYPES
// ============================================================

export interface HousingPurchaseInput {
    year: number;
    purchase: {
        price: number;           // DKK
        downPaymentCash: number; // DKK
        closeDate: string;       // YYYY-MM-DD
    };
    financing: {
        mortgage: {
            enabled: boolean;
            ltvMax?: number;                    // Override from rules
            principal?: number;                 // Manual override
            termYears: number;
            ioYears?: number;                   // [NEW] Years of interest only
            loanType: 'FAST' | 'F5' | 'F_KORT'; // [NEW] Mortgage product type
            amortizationProfile: 'FULL' | 'IO' | 'CUSTOM';
            bondRateNominalAnnual: number;      // e.g. 0.04 for 4%
            contributionRateAnnual?: number;    // [OPTIONAL] Manual override, otherwise uses tiered rules
            paymentsPerYear: 12;
        };
        bankLoan: {
            enabled: boolean;
            principal?: number;                 // Manual override
            rateNominalAnnual: number;
            termYears: number;
            paymentsPerYear: 12;
        };
    };
    transactionCosts: {
        includeDefaultCosts: boolean;
        customCosts: Array<{ label: string; amount: number }>;
        reportAssumptions?: {
            mortgageProcessingFee?: number;
            settlementCommissionRate?: number;
            payoutDeductionRate?: number;
            bankDocumentFee?: number;
            bankValuationFee?: number;
        };
    };
    budgetIntegration: {
        monthlyDisposableIncomeBeforeHousing: number;
        monthlyHousingRunningCosts?: number;    // [DEPRECATED] specific fields below preferred
        propertyTaxRate?: number;              // [NEW] Optional override for Ejendomsværdiskat
        landTaxRate?: number;                  // [NEW] Optional override for Grundskyld
        // [NEW] Granular Operating Costs (from Research Report)
        insurance?: number;                    // Husforsikring (monthly)
        utilities?: number;                    // Vand, varme, el (monthly)
        associationFees?: number;              // Ejerforening / Fællesudgifter (monthly)
        maintenance?: number;                  // Maintenance calc override (monthly)
    };
    scenarioMeta: {
        scenarioId: string;
        notes?: string;
    };
}

// ============================================================
// RULES TYPES
// ============================================================

export type RoundingRule = 'NEAREST_100' | 'NONE';

export interface HousingRules {
    year: number;
    minDownPaymentPct: number;        // e.g. 0.05 for 5%
    mortgageLtvMax: number;           // e.g. 0.80 for 80%
    deedRegistration: {
        fixedFee: number;               // DKK
        rateOfPrice: number;            // e.g. 0.006 for 0.6%
        rounding: RoundingRule;
    };
    pledgeRegistration: {
        fixedFee: number;               // DKK
        rateOfPrincipal: number;        // e.g. 0.015 for 1.5%
        rounding: RoundingRule;
    };
    defaults: {
        buyerAttorneyFee: number;
        bankEstablishmentFee: number;
        valuationFee: number;
        propertyTaxRate: number;              // [NEW] Default Ejendomsværdiskat rate (e.g. 0.0051)
        landTaxRate: number;                  // [NEW] Default Grundskyld rate (promille - e.g. 0.007)
        maintenanceRateAnnual: number;        // [NEW] Default maintenance provision (e.g. 0.01)
    };
    mortgageRules: {
        tieredContributions: Array<{          // [NEW] Bidragssats tranches
            ltvFrom: number;
            ltvTo: number;
            rate: number;
        }>;
    };
}

// ============================================================
// OUTPUT TYPES
// ============================================================

export interface AmortizationYear {
    year: number;
    mortgageInterest: number;
    mortgagePrincipal: number;
    mortgageContribution: number;
    bankInterest: number;
    bankPrincipal: number;
    totalCost: number;
    debtRemaining: number;
}

export interface HousingPurchaseOutput {
    derived: {
        mortgagePrincipal: number;
        bankPrincipal: number;
        deedFee: number;
        mortgagePledgeFee: number;
        bankPledgeFee: number;
        totalUpfrontCosts: number;
    };
    monthly: {
        mortgagePayment: number;
        mortgageContribution: number;
        bankPayment: number;
        propertyTax: number;                   // [NEW] Combined monthly tax
        maintenanceProvision: number;          // [NEW] Monthly maintenance provision
        housingRunningCosts: number;           // Operational costs
        totalHousingCostPerMonth: number;
        disposableAfterHousing: number;
    };
    amortizationSchedule: AmortizationYear[]; // [NEW] 30-year schedule
    balanceImpact: {
        assetHomeValueInitial: number;
        liabilitiesInitial: number;
        equityInitial: number;
    };
    audits: Audit[];
    warnings: string[];
    assumptions: string[];
}

// ============================================================
// AUDIT TYPES (compatible with CALC_ENGINE.md)
// ============================================================

export interface AuditInput {
    label: string;
    value: number | string;
    unit?: string;
    source?: string;
}

export interface AuditStep {
    label: string;
    formula: string;
    value: number | string;
    unit?: string;
}

export interface AuditOutput {
    label: string;
    value: number | string;
    unit?: string;
}

export interface Audit {
    auditId: string;
    title: string;
    context: Record<string, unknown>;
    inputs: AuditInput[];
    steps: AuditStep[];
    outputs: AuditOutput[];
    notes: string[];
}
