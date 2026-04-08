import { createHousingPurchaseModule, runProjection, type ProjectionInput } from "@/src/projection";
import { createDebtModule, type DebtInput } from "@/src/projection/modules/debt";
import { createPortfolioModule, type HoldingInput } from "@/src/projection/modules/portfolio";
import { loadHousingRules } from "@/src/housing/rules.server";
import { type HousingPurchaseInput } from "@/src/housing";
import { fail, ok } from "@/app/api/_lib/response";
import { createDefaultHousingInput, normalizeHousingInput } from "@/src/housing/defaults";

interface ProjectionRequest {
  startMonth: string;
  months: number;
  includeHousing: boolean;
  startingBalanceSheet: {
    cash: number;
    portfolioValue: number;
    otherLiabilities?: number;
  };
  baseline: {
    monthlyDisposableIncomeBeforeHousing: number;
    monthlyNonHousingExpenses: number;
    annualIncomeIncreasePercent?: number;
  };
  housingInput?: HousingPurchaseInput;
  debts?: DebtInput[];
  holdings?: HoldingInput[];
  monthlySavingsContribution?: number;
}

function defaultHousingInput(): HousingPurchaseInput {
  return normalizeHousingInput(createDefaultHousingInput(2026));
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
        debts: [],
        holdings: [],
        monthlySavingsContribution: 5000,
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

    // 1. Housing Module
    if (body.includeHousing) {
      const housingInput = normalizeHousingInput(body.housingInput ?? defaultHousingInput());
      const rules = loadRulesOrExample(housingInput.year);
      modules.push(createHousingPurchaseModule({ input: housingInput, rules }));
    }

    // 2. Debt Module
    if (body.debts && body.debts.length > 0) {
      modules.push(createDebtModule({ debts: body.debts }));
    }

    // 3. Portfolio Module
    if (body.holdings && body.holdings.length > 0) {
      modules.push(createPortfolioModule({
        holdings: body.holdings,
        monthlyContribution: body.monthlySavingsContribution || 0
      }));
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
