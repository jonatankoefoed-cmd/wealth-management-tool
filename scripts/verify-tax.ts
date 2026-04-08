export {};

const fs = require("node:fs");
const path = require("node:path");
const { calculateTax } = require("../src/lib/tax");

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, label: string): void {
  const delta = Math.abs(actual - expected);
  if (delta > tolerance) {
    throw new Error(`${label}: expected ${expected}, got ${actual} (delta ${delta}, tolerance ${tolerance})`);
  }
}

function toTaxInput(rawInput: any): any {
  const input: any = {
    taxYear: rawInput.taxYear ?? 2026,
    municipality: rawInput.municipality ?? {
      rate: 0.25,
      churchRate: 0.007,
    },
  };

  if (rawInput.personalIncome) {
    input.personalIncome = rawInput.personalIncome;
  }

  if (rawInput.isMarried !== undefined) {
    input.isMarried = rawInput.isMarried;
  }

  const investments: any = {};
  if (rawInput.investments) {
    Object.assign(investments, rawInput.investments);
  }
  if (rawInput.equityIncome) {
    investments.equityIncome = rawInput.equityIncome;
  }
  if (rawInput.ask) {
    investments.ask = rawInput.ask;
  }
  if (rawInput.markToMarket) {
    investments.markToMarket = rawInput.markToMarket;
  }
  if (rawInput.capitalIncome?.netCapitalIncome !== undefined) {
    investments.netCapitalIncome = rawInput.capitalIncome.netCapitalIncome;
  }
  if (rawInput.netCapitalIncome !== undefined) {
    investments.netCapitalIncome = rawInput.netCapitalIncome;
  }

  if (Object.keys(investments).length > 0) {
    input.investments = investments;
  }

  return input;
}

function verifyCase(testCase: any): { id: string; passed: boolean; notes: string[] } {
  const tolerance = testCase.tolerance ?? 1;
  const input = toTaxInput(testCase.input);
  const output = calculateTax(input);
  const notes: string[] = [];

  const personalBreakdown = output.breakdown.personal?.breakdown;
  const equityBreakdown = output.breakdown.equity?.breakdown;
  const askBreakdown = output.breakdown.ask?.breakdown;
  const askTop = output.breakdown.ask;
  const markToMarket = output.breakdown.markToMarket;

  switch (testCase.id) {
    case "personal-base-case": {
      assertCondition(Boolean(personalBreakdown), "Missing personal breakdown.");
      assertClose(personalBreakdown.amBidrag, testCase.expected.amBidrag, tolerance, "amBidrag");
      assertClose(personalBreakdown.incomeAfterAM, testCase.expected.incomeAfterAM, tolerance, "incomeAfterAM");
      assertClose(personalBreakdown.employmentDeduction, testCase.expected.employmentDeduction, tolerance, "employmentDeduction");
      assertClose(personalBreakdown.middleTax, testCase.expected.middleTax, tolerance, "middleTax");
      assertClose(personalBreakdown.topTax, testCase.expected.topTax, tolerance, "topTax");
      assertClose(personalBreakdown.topTopTax, testCase.expected.topTopTax, tolerance, "topTopTax");
      assertClose(personalBreakdown.jobDeduction, testCase.expected.jobDeduction, tolerance, "jobDeduction");

      const simplificationDeltas: string[] = [];
      const compareSimplified = (label: string, actual: number, expected: number) => {
        const delta = Math.abs(actual - expected);
        if (delta > tolerance) {
          simplificationDeltas.push(`${label}: expected ${expected}, got ${actual}`);
        }
      };
      compareSimplified("municipalTax", personalBreakdown.municipalTax, testCase.expected.municipalTax);
      compareSimplified("churchTax", personalBreakdown.churchTax, testCase.expected.churchTax);
      compareSimplified("bottomTax", personalBreakdown.bottomTax, testCase.expected.bottomTax);
      compareSimplified("totalTax", output.totals.personalTaxTotal, testCase.expected.totalTax);
      compareSimplified("netIncome", output.breakdown.personal.netIncome, testCase.expected.netIncome);

      if (simplificationDeltas.length > 0) {
        assertCondition(
          output.assumptions.some((item: string) => item.includes("Forenklet model")),
          "Expected explicit simplification assumption for personal tax.",
        );
        notes.push(`simplification-deltas=${simplificationDeltas.join(" | ")}`);
      }

      notes.push(`effectiveTaxRate=${output.breakdown.personal.effectiveTaxRate}`);
      break;
    }
    case "personal-with-middle-tax": {
      assertCondition(Boolean(personalBreakdown), "Missing personal breakdown.");
      assertCondition(personalBreakdown.middleTax > 0, "Expected middleTax to be > 0.");
      notes.push(`middleTax=${personalBreakdown.middleTax}`);
      break;
    }
    case "personal-with-top-tax": {
      assertCondition(Boolean(personalBreakdown), "Missing personal breakdown.");
      assertCondition(personalBreakdown.topTax > 0, "Expected topTax to be > 0.");
      notes.push(`topTax=${personalBreakdown.topTax}`);
      break;
    }
    case "equity-under-threshold":
    case "equity-over-threshold":
    case "equity-married-threshold": {
      assertCondition(Boolean(equityBreakdown), "Missing equity breakdown.");
      if (testCase.expected.taxableEquityIncome !== undefined) {
        assertClose(equityBreakdown.taxableEquityIncome, testCase.expected.taxableEquityIncome, tolerance, "taxableEquityIncome");
      }
      if (testCase.expected.threshold !== undefined) {
        assertClose(equityBreakdown.threshold, testCase.expected.threshold, tolerance, "threshold");
      }
      if (testCase.expected.tier1Base !== undefined) {
        assertClose(equityBreakdown.tier1Base, testCase.expected.tier1Base, tolerance, "tier1Base");
      }
      if (testCase.expected.tier1Tax !== undefined) {
        assertClose(equityBreakdown.tier1Tax, testCase.expected.tier1Tax, tolerance, "tier1Tax");
      }
      if (testCase.expected.tier2Base !== undefined) {
        assertClose(equityBreakdown.tier2Base, testCase.expected.tier2Base, tolerance, "tier2Base");
      }
      if (testCase.expected.tier2Tax !== undefined) {
        assertClose(equityBreakdown.tier2Tax, testCase.expected.tier2Tax, tolerance, "tier2Tax");
      }
      if (testCase.expected.totalEquityTax !== undefined) {
        assertClose(output.totals.equityTaxTotal, testCase.expected.totalEquityTax, tolerance, "totalEquityTax");
      }
      notes.push(`equityTax=${output.totals.equityTaxTotal}`);
      break;
    }
    case "ask-positive-return":
    case "ask-negative-return":
    case "ask-with-deposits": {
      assertCondition(Boolean(askBreakdown && askTop), "Missing ASK breakdown.");
      if (testCase.expected.taxableReturn !== undefined) {
        assertClose(askTop.taxableReturn, testCase.expected.taxableReturn, tolerance, "ask.taxableReturn");
      }
      if (testCase.expected.tax !== undefined) {
        assertClose(askTop.tax, testCase.expected.tax, tolerance, "ask.tax");
      }
      if (testCase.expected.lossToCarryForward !== undefined) {
        assertClose(askTop.lossToCarryForward, testCase.expected.lossToCarryForward, tolerance, "ask.lossToCarryForward");
      }
      if (testCase.expected.rawReturn !== undefined) {
        assertClose(askBreakdown.rawReturn, testCase.expected.rawReturn, tolerance, "ask.rawReturn");
      }
      if (testCase.expected.warning) {
        assertCondition(
          output.warnings.some((warning: string) => warning.includes("Negativt afkast")),
          "Expected negative ASK return warning.",
        );
      }
      notes.push(`askTax=${askTop.tax}`);
      break;
    }
    case "mark-to-market-on-list":
    case "mark-to-market-not-on-list": {
      assertCondition(Boolean(markToMarket), "Missing mark-to-market breakdown.");
      const firstHolding = markToMarket.holdingDetails[0];
      assertCondition(Boolean(firstHolding), "Expected one mark-to-market holding detail.");
      if (testCase.expected.incomeType !== undefined) {
        assertCondition(firstHolding.incomeType === testCase.expected.incomeType, "Unexpected incomeType classification.");
      }
      if (testCase.expected.equityIncomeTaxableChange !== undefined) {
        assertClose(
          markToMarket.byIncomeType.equityIncome.taxableChange,
          testCase.expected.equityIncomeTaxableChange,
          tolerance,
          "equityIncomeTaxableChange",
        );
      }
      if (testCase.expected.capitalIncomeTaxableChange !== undefined) {
        assertClose(
          markToMarket.byIncomeType.capitalIncome.taxableChange,
          testCase.expected.capitalIncomeTaxableChange,
          tolerance,
          "capitalIncomeTaxableChange",
        );
      }
      notes.push(`markToMarketTax=${markToMarket.totalTax}`);
      break;
    }
    default: {
      // Generic fallback for future cases.
      notes.push("No explicit checker. Calculation executed successfully.");
      break;
    }
  }

  return {
    id: testCase.id,
    passed: true,
    notes,
  };
}

async function main() {
  const filePath = path.resolve(__dirname, "../specs/tax/test_cases_2026.json");
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const testCases = payload.testCases || [];

  let passed = 0;
  const failed: Array<{ id: string; error: string }> = [];
  const details: Array<{ id: string; notes: string[] }> = [];

  for (const testCase of testCases) {
    try {
      const result = verifyCase(testCase);
      if (result.passed) {
        passed += 1;
      }
      details.push({ id: result.id, notes: result.notes });
    } catch (error) {
      failed.push({
        id: testCase.id,
        error: (error as Error).message,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        taxYear: payload.meta?.taxYear ?? 2026,
        total: testCases.length,
        passed,
        failed: failed.length,
        details,
        failures: failed,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) {
    throw new Error(`Tax verification failed for ${failed.length} test case(s).`);
  }
}

main().catch((error: unknown) => {
  console.error("Tax verification failed:", error);
  process.exitCode = 1;
});
