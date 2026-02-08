import { computeTaxSnapshot } from "@/src/backend";
import type { TaxInput } from "@/src/lib/tax";
import testCasesPayload from "@/specs/tax/test_cases_2026.json";
import { fail, ok } from "@/app/api/_lib/response";

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toTaxInput(raw: unknown): TaxInput {
  const source = asRecord(raw);

  const taxYear = Number(source.taxYear ?? 2026);
  const municipality = asRecord(source.municipality);

  const input: TaxInput = {
    taxYear,
    municipality: {
      rate: Number(municipality.rate ?? 0.25),
      churchRate:
        municipality.churchRate === undefined
          ? undefined
          : Number(municipality.churchRate),
    },
  };

  const personalIncomeRaw = asRecord(source.personalIncome);
  const hasPersonalIncome =
    personalIncomeRaw.salaryGross !== undefined || personalIncomeRaw.grossIncome !== undefined;

  if (hasPersonalIncome) {
    input.personalIncome = {
      salaryGross: Number(personalIncomeRaw.salaryGross ?? personalIncomeRaw.grossIncome ?? 0),
      bonusGross:
        personalIncomeRaw.bonusGross === undefined
          ? undefined
          : Number(personalIncomeRaw.bonusGross),
      otherAMIncome:
        personalIncomeRaw.otherAMIncome === undefined
          ? undefined
          : Number(personalIncomeRaw.otherAMIncome),
      pensionEmployee:
        personalIncomeRaw.pensionEmployee === undefined &&
        personalIncomeRaw.pensionContributions === undefined
          ? undefined
          : Number(personalIncomeRaw.pensionEmployee ?? personalIncomeRaw.pensionContributions),
      atp: personalIncomeRaw.atp === undefined ? undefined : Number(personalIncomeRaw.atp),
      deductions:
        personalIncomeRaw.deductions === undefined
          ? undefined
          : {
              fagforening:
                asRecord(personalIncomeRaw.deductions).fagforening === undefined
                  ? undefined
                  : Number(asRecord(personalIncomeRaw.deductions).fagforening),
              befordring:
                asRecord(personalIncomeRaw.deductions).befordring === undefined
                  ? undefined
                  : Number(asRecord(personalIncomeRaw.deductions).befordring),
              other:
                asRecord(personalIncomeRaw.deductions).other === undefined
                  ? undefined
                  : Number(asRecord(personalIncomeRaw.deductions).other),
            },
      isSenior:
        personalIncomeRaw.isSenior === undefined
          ? undefined
          : Boolean(personalIncomeRaw.isSenior),
    };
  }

  const investmentsRaw = asRecord(source.investments);
  const equityRaw =
    sourceHas(source, "equityIncome")
      ? asRecord(source.equityIncome)
      : asRecord(investmentsRaw.equityIncome);
  const askRaw =
    sourceHas(source, "ask") ? asRecord(source.ask) : asRecord(investmentsRaw.ask);
  const markRaw =
    sourceHas(source, "markToMarket")
      ? asRecord(source.markToMarket)
      : asRecord(investmentsRaw.markToMarket);

  const investments: NonNullable<TaxInput["investments"]> = {};

  if (Object.keys(equityRaw).length > 0) {
    investments.equityIncome = {
      realizedGains: Number(equityRaw.realizedGains ?? 0),
      dividends: Number(equityRaw.dividends ?? 0),
      lossesCarryForwardUsed:
        equityRaw.lossesCarryForwardUsed === undefined
          ? undefined
          : Number(equityRaw.lossesCarryForwardUsed),
    };
  }

  if (Object.keys(askRaw).length > 0) {
    investments.ask = {
      openingValue: Number(askRaw.openingValue ?? askRaw.valueStartOfYear ?? 0),
      closingValue: Number(askRaw.closingValue ?? askRaw.valueEndOfYear ?? 0),
      netDeposits: Number(askRaw.netDeposits ?? askRaw.deposits ?? 0),
      netWithdrawals: Number(askRaw.netWithdrawals ?? askRaw.withdrawals ?? 0),
      lossCarryForward:
        askRaw.lossCarryForward === undefined
          ? undefined
          : Number(askRaw.lossCarryForward),
    };
  }

  if (Object.keys(markRaw).length > 0 && Array.isArray(markRaw.holdings)) {
    investments.markToMarket = {
      holdings: markRaw.holdings.map((holding) => {
        const row = asRecord(holding);
        return {
          identifier: String(row.identifier ?? row.instrumentId ?? "unknown"),
          name: String(row.name ?? row.instrumentName ?? "Unknown instrument"),
          instrumentType: String(row.instrumentType ?? "UNKNOWN"),
          openingValue: Number(row.openingValue ?? 0),
          closingValue: Number(row.closingValue ?? 0),
          onSkatsPositivliste:
            row.onSkatsPositivliste === undefined
              ? undefined
              : Boolean(row.onSkatsPositivliste),
        };
      }),
    };
  }

  const netCapitalIncomeSource =
    investmentsRaw.netCapitalIncome ?? asRecord(source.capitalIncome).netCapitalIncome;
  if (netCapitalIncomeSource !== undefined) {
    investments.netCapitalIncome = Number(netCapitalIncomeSource);
  }

  if (Object.keys(investments).length > 0) {
    input.investments = investments;
  }

  if (source.isMarried !== undefined) {
    input.isMarried = Boolean(source.isMarried);
  }

  return input;
}

function sourceHas(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export async function GET(): Promise<Response> {
  try {
    const firstCase = testCasesPayload.testCases[0];

    return ok({
      defaults: {
        taxYear: 2026,
        municipality: {
          rate: 0.25,
          churchRate: 0.007,
        },
        personalIncome: {
          grossIncome: 650000,
          pensionContributions: 50000,
          customDeductions: 10000,
        },
        investments: {
          equityIncome: {
            realizedGains: 45000,
            realizedLosses: 5000,
            dividends: 8000,
            lossCarryForwardFromPriorYears: 0,
          },
        },
      },
      testCaseIds: testCasesPayload.testCases.map((testCase) => testCase.id),
      firstTestCase: firstCase,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const raw = (await request.json()) as unknown;
    const taxInput = toTaxInput(raw);
    const result = computeTaxSnapshot(taxInput);

    return ok({ input: taxInput, result });
  } catch (error) {
    return fail(error, 400);
  }
}
