import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";

export async function GET(request: Request): Promise<Response> {
    try {
        const { searchParams } = new URL(request.url);
        const horizonYears = Number(searchParams.get("horizonYears") || 10);
        const startYear = 2026;

        const prisma = getPrismaClient();
        const userId = await requireDefaultUserId();

        // 1. Fetch Inputs
        const scenario = await prisma.scenario.findFirst({
            where: { userId, isBase: true },
            include: { overrides: true },
        });

        const inputs = scenario?.overrides.reduce((acc, curr) => {
            acc[curr.key] = curr.valueJson;
            return acc;
        }, {} as Record<string, any>) || {};

        const monthlyGrossStart = Number(inputs.baseline?.monthlyGrossIncome || 65000);
        const pensionRate = Number(inputs.baseline?.pensionContributionRate || 0);
        const growthPct = Number(inputs.baseline?.salaryGrowthPct ?? 0.02);
        const growthPath = inputs.salary_growth_path?.yearlyPct || Array(horizonYears).fill(growthPct * 100);

        // Bonus Logic
        const annualBonus = Number(inputs.baseline?.annualBonus || 0);
        const defaultBonusPct = monthlyGrossStart > 0 ? (annualBonus / (monthlyGrossStart * 12)) : 0;
        const bonusPath = inputs.bonus_growth_path?.yearlyPct
            ? inputs.bonus_growth_path.yearlyPct.map((p: any) => Number(p))
            : Array(horizonYears).fill(defaultBonusPct);

        // Allocation Logic
        const savingsRate = Number(inputs.baseline?.savingsRatePct || 0);
        const flatSavings = Number(inputs.baseline?.monthlyLiquidSavings || 5000);

        // Fetch Base Expenses
        const expenses = await prisma.expenseLine.findMany({ where: { userId } });
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

        // 2. Run Projection Engine
        const { runProjection, createIncomeModule } = await import("@/src/projection");
        const now = new Date();
        const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const incomeModule = createIncomeModule({
            startingSalary: monthlyGrossStart,
            yearlyGrowth: growthPath.map((p: any) => Number(p)),
            yearlyBonusPct: bonusPath,
            bonusMonth: 2
        });

        const engineInput = {
            horizon: { startMonth, months: horizonYears * 12 },
            startingBalanceSheet: { cash: 0, portfolioValue: 0, homeValue: 0, mortgageBalance: 0, bankLoanBalance: 0, otherAssets: 0, otherLiabilities: 0 },
            baseline: {
                monthlyDisposableIncomeBeforeHousing: monthlyGrossStart * 0.73, // approx net
                monthlyNonHousingExpenses: Object.values(monthlyExpensesByGroup).reduce((a, b) => a + b, 0),
                annualIncomeIncreasePercent: 0
            } as any,
            modules: [incomeModule]
        };

        const projection = runProjection(engineInput);

        // 3. Map to EvolutionMatrix Format
        const years = [];
        for (let y = 0; y < horizonYears; y++) {
            const monthSlice = projection.series.slice(y * 12, (y + 1) * 12);

            // Calculate Yearly Totals
            const yearlyTotals = monthSlice.reduce((acc, m) => {
                acc.income += m.pnl.income;
                acc.salary += m.pnl.salary || 0;
                acc.bonus += m.pnl.bonus || 0;
                acc.totalExpenses += m.pnl.totalExpenses;
                acc.tax += m.pnl.tax;
                acc.net += m.pnl.net;
                return acc;
            }, { income: 0, salary: 0, bonus: 0, totalExpenses: 0, tax: 0, net: 0 });

            // Create "Typical Month" (Average)
            const typicalMonth = {
                income: {
                    salary: yearlyTotals.salary / 12,
                    bonus: yearlyTotals.bonus / 12,
                    other: 0,
                    total: yearlyTotals.income / 12
                },
                expenses: {
                    total: yearlyTotals.totalExpenses / 12,
                    housing: (monthlyExpensesByGroup["Housing"] || 0), // Base expense approx
                    utilities: (monthlyExpensesByGroup["Utilities"] || 0),
                    transport: (monthlyExpensesByGroup["Transport"] || 0),
                    food: (monthlyExpensesByGroup["Food"] || 0),
                    subscriptions: (monthlyExpensesByGroup["Subscriptions"] || 0),
                    insurance: (monthlyExpensesByGroup["Insurance"] || 0),
                    other: (monthlyExpensesByGroup["Other"] || 0)
                },
                tax: { total: yearlyTotals.tax / 12 },
                netDisposable: yearlyTotals.net / 12,
                allocations: {
                    invest: savingsRate > 0 ? (yearlyTotals.net / 12) * savingsRate : flatSavings,
                    liquidSavings: 0,
                    residual: savingsRate > 0 ? (yearlyTotals.net / 12) * (1 - savingsRate) : (yearlyTotals.net / 12) - flatSavings
                }
            };

            years.push({
                yearIndex: y + 1,
                calendarYear: startYear + y,
                typicalMonth,
                notes: [`Growth applied`]
            });
        }

        return ok({
            startYear,
            horizonYears,
            years,
            dataQuality: {
                hasIncomeInputs: true,
                hasExpenses: expenses.length > 0
            }
        });

    } catch (error) {
        console.error("Evolution API Error:", error);
        return fail(error);
    }
}
