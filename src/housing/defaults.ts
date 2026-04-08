import type { HousingPurchaseInput } from "./types";

export interface HousingTransactionReportAssumptions {
    mortgageProcessingFee: number;
    settlementCommissionRate: number;
    payoutDeductionRate: number;
    bankDocumentFee: number;
    bankValuationFee: number;
}

export const REPORT_CUSTOM_COST_LABELS = {
    mortgageProcessingFee: "Realkredit - Lånesagsgebyr",
    settlementCommission: "Realkredit - Afregningsprovision",
    payoutDeduction: "Realkredit - Kursfradrag",
    bankDocumentFee: "Bank - Dokumentgebyr",
    bankValuationFee: "Bank - Vurderingsgebyr",
} as const;

export const DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS: HousingTransactionReportAssumptions = {
    mortgageProcessingFee: 3500,
    settlementCommissionRate: 0.0015,
    payoutDeductionRate: 0.002,
    bankDocumentFee: 4200,
    bankValuationFee: 2262.5,
};

const REPORT_COST_LABEL_SET = new Set<string>(Object.values(REPORT_CUSTOM_COST_LABELS));

export function createDefaultHousingInput(year = 2026): HousingPurchaseInput {
    return normalizeHousingInput({
        year,
        purchase: {
            price: 3_500_000,
            downPaymentCash: 175_000,
            closeDate: `${year}-06-01`,
        },
        financing: {
            mortgage: {
                enabled: true,
                loanType: "FAST",
                termYears: 30,
                amortizationProfile: "FULL",
                bondRateNominalAnnual: 0.0409,
                paymentsPerYear: 12,
                ioYears: 0,
            },
            bankLoan: {
                enabled: true,
                rateNominalAnnual: 0.055,
                termYears: 20,
                paymentsPerYear: 12,
            },
        },
        transactionCosts: {
            includeDefaultCosts: true,
            customCosts: [],
            reportAssumptions: { ...DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS },
        },
        budgetIntegration: {
            monthlyDisposableIncomeBeforeHousing: 40000,
            monthlyHousingRunningCosts: 4000,
            propertyTaxRate: 0.0051,
            landTaxRate: 0.008,
            utilities: 2500,
            insurance: 500,
            associationFees: 0,
        },
        scenarioMeta: {
            scenarioId: "purchase_plan",
        },
    });
}

export function deriveLoanSplit(input: {
    price: number;
    downPaymentCash: number;
    mortgageLtvMax?: number;
    mortgageEnabled?: boolean;
    bankLoanEnabled?: boolean;
}) {
    const price = Number(input.price || 0);
    const downPaymentCash = Number(input.downPaymentCash || 0);
    const mortgageLtvMax = Number(input.mortgageLtvMax ?? 0.8);
    const fundingGap = Math.max(0, price - downPaymentCash);
    const maxMortgage = Math.max(0, price * mortgageLtvMax);

    const mortgagePrincipal = input.mortgageEnabled === false
        ? 0
        : Math.min(fundingGap, maxMortgage);

    const bankPrincipal = input.bankLoanEnabled === false
        ? 0
        : Math.max(0, fundingGap - mortgagePrincipal);

    return {
        fundingGap,
        mortgagePrincipal,
        bankPrincipal,
    };
}

export function normalizeHousingInput(raw: Partial<HousingPurchaseInput> | null | undefined): HousingPurchaseInput {
    const year = Number(raw?.year ?? 2026);
    const defaults = createRawDefaultHousingInput(year);

    const merged: HousingPurchaseInput = {
        year,
        purchase: {
            ...defaults.purchase,
            ...(raw?.purchase || {}),
        },
        financing: {
            mortgage: {
                ...defaults.financing.mortgage,
                ...(raw?.financing?.mortgage || {}),
            },
            bankLoan: {
                ...defaults.financing.bankLoan,
                ...(raw?.financing?.bankLoan || {}),
            },
        },
        transactionCosts: {
            ...defaults.transactionCosts,
            ...(raw?.transactionCosts || {}),
            customCosts: Array.isArray(raw?.transactionCosts?.customCosts)
                ? raw!.transactionCosts!.customCosts.map(c => ({
                    label: String(c?.label ?? ""),
                    amount: Number(c?.amount ?? 0),
                }))
                : defaults.transactionCosts.customCosts.slice(),
            reportAssumptions: {
                ...DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS,
                ...(raw?.transactionCosts?.reportAssumptions || {}),
            },
        },
        budgetIntegration: {
            ...defaults.budgetIntegration,
            ...(raw?.budgetIntegration || {}),
        },
        scenarioMeta: {
            ...defaults.scenarioMeta,
            ...(raw?.scenarioMeta || {}),
        },
    };

    if (!merged.purchase.closeDate) {
        merged.purchase.closeDate = `${year}-06-01`;
    }
    if (!merged.scenarioMeta?.scenarioId) {
        merged.scenarioMeta = { ...merged.scenarioMeta, scenarioId: "purchase_plan" };
    }

    merged.transactionCosts.customCosts = mergeReportCostsIntoCustomCosts(merged);
    return merged;
}

export function calcReportCostBreakdown(housing: HousingPurchaseInput) {
    const assumptions = {
        ...DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS,
        ...(housing.transactionCosts?.reportAssumptions || {}),
    };
    const split = deriveLoanSplit({
        price: housing.purchase?.price ?? 0,
        downPaymentCash: housing.purchase?.downPaymentCash ?? 0,
        mortgageLtvMax: housing.financing?.mortgage?.ltvMax ?? 0.8,
        mortgageEnabled: housing.financing?.mortgage?.enabled !== false,
        bankLoanEnabled: housing.financing?.bankLoan?.enabled !== false,
    });

    const settlementCommission = split.mortgagePrincipal > 0
        ? split.mortgagePrincipal * assumptions.settlementCommissionRate
        : 0;

    const payoutDeduction = split.mortgagePrincipal > 0
        ? split.mortgagePrincipal * assumptions.payoutDeductionRate
        : 0;

    return {
        mortgagePrincipal: split.mortgagePrincipal,
        bankPrincipal: split.bankPrincipal,
        mortgageProcessingFee: split.mortgagePrincipal > 0 ? assumptions.mortgageProcessingFee : 0,
        settlementCommission,
        payoutDeduction,
        bankDocumentFee: split.bankPrincipal > 0 ? assumptions.bankDocumentFee : 0,
        bankValuationFee: split.bankPrincipal > 0 ? assumptions.bankValuationFee : 0,
    };
}

function mergeReportCostsIntoCustomCosts(housing: HousingPurchaseInput) {
    const reportCosts = calcReportCostBreakdown(housing);
    const existing = (housing.transactionCosts?.customCosts || []).filter(
        (c) => !REPORT_COST_LABEL_SET.has(c.label)
    );

    const derived = [
        { label: REPORT_CUSTOM_COST_LABELS.mortgageProcessingFee, amount: reportCosts.mortgageProcessingFee },
        { label: REPORT_CUSTOM_COST_LABELS.settlementCommission, amount: reportCosts.settlementCommission },
        { label: REPORT_CUSTOM_COST_LABELS.payoutDeduction, amount: reportCosts.payoutDeduction },
        { label: REPORT_CUSTOM_COST_LABELS.bankDocumentFee, amount: reportCosts.bankDocumentFee },
        { label: REPORT_CUSTOM_COST_LABELS.bankValuationFee, amount: reportCosts.bankValuationFee },
    ]
        .filter((c) => c.amount > 0)
        .map((c) => ({ ...c, amount: round2(c.amount) }));

    return [...existing, ...derived];
}

function createRawDefaultHousingInput(year = 2026): HousingPurchaseInput {
    return {
        year,
        purchase: {
            price: 3_500_000,
            downPaymentCash: 175_000,
            closeDate: `${year}-06-01`,
        },
        financing: {
            mortgage: {
                enabled: true,
                loanType: "FAST",
                termYears: 30,
                amortizationProfile: "FULL",
                bondRateNominalAnnual: 0.0409,
                paymentsPerYear: 12,
                ioYears: 0,
            },
            bankLoan: {
                enabled: true,
                rateNominalAnnual: 0.055,
                termYears: 20,
                paymentsPerYear: 12,
            },
        },
        transactionCosts: {
            includeDefaultCosts: true,
            customCosts: [],
            reportAssumptions: { ...DEFAULT_TRANSACTION_REPORT_ASSUMPTIONS },
        },
        budgetIntegration: {
            monthlyDisposableIncomeBeforeHousing: 40000,
            monthlyHousingRunningCosts: 4000,
            propertyTaxRate: 0.0051,
            landTaxRate: 0.008,
            utilities: 2500,
            insurance: 500,
            associationFees: 0,
        },
        scenarioMeta: {
            scenarioId: "purchase_plan",
        },
    };
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}
