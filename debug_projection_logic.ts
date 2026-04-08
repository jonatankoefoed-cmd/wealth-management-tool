
import { createIncomeModule } from './src/projection/modules/income';
import { runProjection } from './src/projection';

// Mock inputs based on debug output
const mockInputs = {
    baseline: {
        monthlyGrossIncome: 48500,
        annualBonus: 290000,
        monthlyDisposableIncomeBeforeHousing: 35000,
        monthlyNonHousingExpenses: 20000,
    },
    salary_growth_path: {
        yearlyPct: [0.36, 0.06, 0.35, 0.06, 0.43, 0.06, 0.06, 0.23, 0.075] // 9 elements
    }
};

const horizonYears = 10;
const monthlyGrossStart = mockInputs.baseline.monthlyGrossIncome;
const annualBonus = mockInputs.baseline.annualBonus;

// Replicate fallback logic
const defaultBonusPct = monthlyGrossStart > 0 ? (annualBonus / (monthlyGrossStart * 12)) : 0;
// Note: debug output show NO bonus_growth_path
const bonusPath = Array(horizonYears).fill(defaultBonusPct);

console.log("Debug Params:");
console.log("monthlyGrossStart:", monthlyGrossStart);
console.log("annualBonus:", annualBonus);
console.log("defaultBonusPct:", defaultBonusPct);
console.log("bonusPath sample:", bonusPath[0]);

const growthPath = mockInputs.salary_growth_path.yearlyPct;
// Extend growth path to 10 years if needed? Logic fallback?
// Route.ts: const growthPath = inputs.salary_growth_path?.yearlyPct || Array(horizonYears).fill(2);

const incomeModule = createIncomeModule({
    startingSalary: monthlyGrossStart,
    yearlyGrowth: growthPath,
    yearlyBonusPct: bonusPath,
    bonusMonth: 2
});

const engineInput = {
    horizon: { startMonth: '2026-01', months: 120 },
    startingBalanceSheet: { cash: 0, portfolioValue: 0, homeValue: 0, mortgageBalance: 0, bankLoanBalance: 0, otherAssets: 0, otherLiabilities: 0 },
    baseline: {
        monthlyDisposableIncomeBeforeHousing: 35000,
        monthlyNonHousingExpenses: 20000,
        annualIncomeIncreasePercent: 0
    },
    modules: [incomeModule]
};

try {
    const result = runProjection(engineInput as any);
    console.log("Projection Run Success");

    // Check Month 3 (Index 2) for Year 1
    const m3 = result.series[2];
    console.log(`Month 3 (Bonus Month) Income: ${m3.pnl.income}, Salary: ${m3.pnl.salary}, Bonus: ${m3.pnl.bonus}`);

    // Check Year 1 Total
    let y1Bonus = 0;
    for (let i = 0; i < 12; i++) y1Bonus += result.series[i].pnl.bonus || 0;
    console.log("Year 1 Total Bonus:", y1Bonus);

} catch (e) {
    console.error("Projection Failed:", e);
}
