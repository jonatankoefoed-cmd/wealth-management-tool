import { createHousingPurchaseModule, runProjection, type ProjectionInput } from "@/src/projection";
import { loadHousingRules, type HousingPurchaseInput } from "@/src/housing";
import { fail, ok } from "@/app/api/_lib/response";

interface ProjectionRequest {
  startMonth: string;
  months: number;
  includeHousing: boolean;
  startingBalanceSheet: {
    cash: number;
    portfolioValue: number;
  };
  baseline: {
    monthlyDisposableIncomeBeforeHousing: number;
    monthlyNonHousingExpenses: number;
  };
  housingInput?: HousingPurchaseInput;
}

function defaultHousingInput(): HousingPurchaseInput {
  return {
    year: 2026,
    purchase: {
      price: 3_000_000,
      downPaymentCash: 300_000,
      closeDate: "2026-04-15",
    },
    financing: {
      mortgage: {
        enabled: true,
        termYears: 30,
        amortizationProfile: "FULL",
        bondRateNominalAnnual: 0.04,
        contributionRateAnnual: 0.0075,
        paymentsPerYear: 12,
      },
      bankLoan: {
        enabled: true,
        rateNominalAnnual: 0.065,
        termYears: 10,
        paymentsPerYear: 12,
      },
    },
    transactionCosts: {
      includeDefaultCosts: true,
      customCosts: [],
    },
    budgetIntegration: {
      monthlyDisposableIncomeBeforeHousing: 35_000,
      monthlyHousingRunningCosts: 4_000,
    },
    scenarioMeta: {
      scenarioId: "projection_housing",
    },
  };
}

function loadRulesOrExample(year: number) {
  try {
    return loadHousingRules(year);
  } catch {
    return loadHousingRules(year, { useExample: true });
  }
}

export async function GET(): Promise<Response> {
  try {
    const now = new Date();
    const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return ok({
      defaults: {
        startMonth,
        months: 24,
        includeHousing: true,
        startingBalanceSheet: {
          cash: 200_000,
          portfolioValue: 500_000,
        },
        baseline: {
          monthlyDisposableIncomeBeforeHousing: 35_000,
          monthlyNonHousingExpenses: 20_000,
        },
        housingInput: defaultHousingInput(),
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ProjectionRequest;

    const modules = [] as ProjectionInput["modules"];

    if (body.includeHousing) {
      const housingInput = body.housingInput ?? defaultHousingInput();
      const rules = loadRulesOrExample(housingInput.year);
      modules.push(createHousingPurchaseModule({ input: housingInput, rules }));
    }

    const input: ProjectionInput = {
      horizon: {
        startMonth: body.startMonth,
        months: body.months,
      },
      startingBalanceSheet: body.startingBalanceSheet,
      baseline: body.baseline,
      modules,
    };

    const result = runProjection(input);
    return ok({ input: body, result });
  } catch (error) {
    return fail(error, 400);
  }
}
