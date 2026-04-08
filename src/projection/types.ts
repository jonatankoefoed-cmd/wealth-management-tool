export interface ProjectionInput {
    horizon: {
        startMonth: string; // YYYY-MM
        months: number;
    };
    startingBalanceSheet: {
        cash: number;
        portfolioValue: number;
        homeValue?: number;
        mortgageBalance?: number;
        bankLoanBalance?: number;
        otherAssets?: number;
        otherLiabilities?: number;
        // Added housing and debt fields based on instruction
        housingDebt?: number; // Generic housing-related debt
        otherDebt?: number; // Any other non-bank loan debt
    };
    baseline: {
        monthlyDisposableIncomeBeforeHousing: number;
        monthlyNonHousingExpenses: number;
        annualIncomeIncreasePercent?: number;
        retirementAge?: number; // [NEW] Age to stop salary income
        municipality?: string;  // [NEW] Fixed tax rate key
        maritalStatus?: 'single' | 'married'; // [NEW] Tax optimization
    };
    modules: ProjectionModule[];
}

export type MonthKey = string; // YYYY-MM

export interface PnLData {
    income: number;
    salary: number; // [NEW] Base salary only
    bonus: number; // [NEW] Bonus only
    expensesNonHousing: number;
    housingInterest: number;
    housingContribution: number;
    housingRunningCosts: number;
    debtInterest: number; // [NEW]
    investmentIncome: number; // [NEW] Dividends/Yield
    tax: number; // [NEW]
    totalExpenses: number;
    net: number;
}

export interface CashFlowData {
    netCashFlow: number;
    upfrontHousingCashOut: number;
    principalRepayment: number;
    debtPrincipalRepayment: number; // [NEW] Non-housing debt
    investmentContribution: number; // [NEW]
}

export interface BalanceSheetData {
    cash: number;
    portfolioValue: number;
    homeValue: number;
    mortgageBalance: number;
    bankLoanBalance: number;
    otherLiabilities: number; // Includes personal debt
    otherAssets: number;
    netWorth: number;
}

export interface Audit {
    auditId?: string;
    title: string;
    description?: string;
    details?: any;
    // Structured audit fields
    context?: Record<string, unknown>;
    inputs?: Array<{ label: string; value: number | string; unit?: string; source?: string }>;
    steps?: Array<{ label: string; formula: string; value: number | string; unit?: string }>;
    outputs?: Array<{ label: string; value: number | string; unit?: string }>;
    notes?: string[];
}

export interface ProjectionModule {
    key: string;
    apply(input: ModuleInput): ModuleOutput;
}

// Aliases for compatibility
export type ScenarioModule = ProjectionModule;
export type ModuleContext = ModuleInput;
export type ModuleResult = ModuleOutput;

export interface ModuleInput {
    months: MonthKey[];
    base: ProjectionInput['baseline'];
}

export interface MonthDeltas {
    pnl: Partial<PnLData>;
    cashFlow: Partial<CashFlowData>;
    balanceSheet: Partial<BalanceSheetData>;
    audits: Audit[];
}

export interface ModuleOutput {
    perMonth: Record<MonthKey, Partial<MonthDeltas>>;
    warnings?: string[];
}

export interface ProjectionSeriesPoint {
    month: MonthKey;
    pnl: PnLData;
    cashFlow: CashFlowData;
    balanceSheet: BalanceSheetData;
    audits: Audit[];
}

export interface ProjectionResult {
    series: ProjectionSeriesPoint[];
    warnings: string[];
}
