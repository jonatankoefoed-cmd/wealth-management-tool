
import { getPrismaClient } from "../lib/prisma";
import { getTodayBalanceSheetSnapshot } from "../lib/future/balance-sheet-snapshot";
import { calculateFutureEvolution } from "../lib/projection-engine";

async function main() {
    const prisma = getPrismaClient();

    // 1. Get a user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error("No user found");
        process.exit(1);
    }
    console.log(`Verifying for user: ${user.id}`);

    // 2. Fetch Snapshot
    console.log("Fetching snapshot...");
    const todaySnapshot = await getTodayBalanceSheetSnapshot(user.id);
    console.log("Today Snapshot:", JSON.stringify(todaySnapshot, null, 2));

    // 3. Fetch Inputs & Expenses (Logic copy from route.ts)
    const scenario = await prisma.scenario.findFirst({
        where: { userId: user.id, isBase: true },
        include: { overrides: true },
    });

    const inputs = scenario?.overrides.reduce((acc, curr) => {
        acc[curr.key] = curr.valueJson;
        return acc;
    }, {} as Record<string, any>) || {};

    const monthlyGrossStart = Number(inputs.baseline?.monthlyGrossIncome || 65000);
    const pensionRate = Number(inputs.baseline?.pensionContributionRate || 0);
    const liquidSavingsBase = Number(inputs.baseline?.monthlyLiquidSavings || 5000);
    const inflationRate = 0.02;
    const growthPath = inputs.salary_growth_path?.yearlyPct || Array(10).fill(2);

    const expenses = await prisma.expenseLine.findMany({ where: { userId: user.id } });

    const mapCategory = (cat: string): string => {
        const lower = cat.toLowerCase();
        if (lower.includes("bolig") || lower.includes("hus") || lower.includes("rent")) return "Housing";
        if (lower.includes("el") || lower.includes("vand") || lower.includes("varme") || lower.includes("util")) return "Utilities";
        if (lower.includes("transport") || lower.includes("bil") || lower.includes("car")) return "Transport";
        if (lower.includes("mad") || lower.includes("food") || lower.includes("indkøb")) return "Food";
        if (lower.includes("sub") || lower.includes("abonnement") || lower.includes("stream")) return "Subscriptions";
        if (lower.includes("forsikring") || lower.includes("insur")) return "Insurance";
        return "Other";
    };

    const monthlyExpensesByGroup = expenses.reduce((acc, exp) => {
        const amount = Number(exp.amount);
        let monthly = amount;
        if (exp.frequency === "YEARLY") monthly = amount / 12;
        if (exp.frequency === "QUARTERLY") monthly = amount / 3;

        const group = mapCategory(exp.category);
        acc[group] = (acc[group] || 0) + monthly;
        return acc;
    }, {} as Record<string, number>);

    console.log("Calculating evolution...");
    const evolutionYears = calculateFutureEvolution({
        monthlyGrossStart,
        pensionRate,
        liquidSavingsBase,
        inflationRate,
        growthPath,
        monthlyExpensesByGroup
    }, 2026, 10);

    // 4. Derive Yearly Balance Sheet (Logic copy from route.ts)
    let currentCash = todaySnapshot.assets.cashDKK;
    let currentPortfolio = todaySnapshot.assets.portfolioValueDKK || 0;
    let currentHousing = todaySnapshot.assets.housingValueDKK || 0;
    let currentSuDebt = todaySnapshot.liabilities.suDebtDKK || 0;
    let currentHousingLoan = todaySnapshot.liabilities.housingLoanDKK || 0;
    let currentOtherDebt = todaySnapshot.liabilities.otherDebtDKK || 0;

    let previousNetWorth = (currentCash + currentPortfolio + currentHousing) - (currentSuDebt + currentHousingLoan + currentOtherDebt);

    const yearlyBalanceSheets = [];

    for (const year of evolutionYears) {
        const annualInvest = (year.typicalMonth.allocations.invest || 0) * 12;
        const annualLiquid = (year.typicalMonth.allocations.liquidSavings || 0) * 12;
        const annualResidual = (year.typicalMonth.allocations.residual || 0) * 12;
        const annualNetDisposable = year.typicalMonth.netDisposable * 12;

        // Logic check from route.ts
        const cashChange = annualLiquid + (annualResidual - annualInvest);
        currentCash += cashChange;

        const marketReturnPct = Number(inputs.assumptions?.marketReturnPct || 0) / 100;
        const marketReturnAmt = currentPortfolio * marketReturnPct;

        const portfolioChange = annualInvest + marketReturnAmt;
        currentPortfolio += portfolioChange;

        const eoyAssets = {
            cashDKK: currentCash,
            portfolioDKK: todaySnapshot.assets.portfolioValueDKK !== null ? currentPortfolio : null,
            housingDKK: currentHousing
        };

        const eoyLiabilities = {
            suDebtDKK: currentSuDebt,
            housingLoanDKK: currentHousingLoan,
            otherDebtDKK: currentOtherDebt
        };

        const eoyNetWorth = (eoyAssets.cashDKK || 0) + (eoyAssets.portfolioDKK || 0) + (eoyAssets.housingDKK || 0)
            - ((eoyLiabilities.suDebtDKK || 0) + (eoyLiabilities.housingLoanDKK || 0) + (eoyLiabilities.otherDebtDKK || 0));

        const startNetWorth = previousNetWorth;
        const calcEndNetWorth = startNetWorth + annualNetDisposable + marketReturnAmt;

        const diff = Math.abs(eoyNetWorth - calcEndNetWorth);
        const isReconciled = diff < 1.0;

        yearlyBalanceSheets.push({
            year: year.calendarYear,
            netWorth: eoyNetWorth,
            reconciled: isReconciled,
            diff
        });

        previousNetWorth = eoyNetWorth;
    }

    console.log("Yearly Balance Sheet Results:");
    console.table(yearlyBalanceSheets);

    if (yearlyBalanceSheets.every(y => y.reconciled)) {
        console.log("SUCCESS: All years reconciled.");
    } else {
        console.error("FAILURE: Reconciliation errors found.");
        process.exit(1);
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
