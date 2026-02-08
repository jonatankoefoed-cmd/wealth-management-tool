import { loadHousingRules, simulateHomePurchase, type HousingPurchaseInput } from "@/src/housing";
import { fail, ok } from "@/app/api/_lib/response";

function defaultInput(year = 2026): HousingPurchaseInput {
  return {
    year,
    purchase: {
      price: 3_000_000,
      downPaymentCash: 300_000,
      closeDate: `${year}-04-15`,
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
      scenarioId: "housing_default",
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
    const input = defaultInput();
    const rules = loadRulesOrExample(input.year);
    const output = simulateHomePurchase(input, rules);

    return ok({
      defaults: input,
      rulesYear: rules.year,
      output,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as HousingPurchaseInput;
    const rules = loadRulesOrExample(body.year ?? 2026);
    const output = simulateHomePurchase(body, rules);

    return ok({
      input: body,
      rulesYear: rules.year,
      output,
    });
  } catch (error) {
    return fail(error, 400);
  }
}
