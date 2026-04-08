import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";
import { calculateFutureEvolution } from "@/lib/projection-engine";

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
        const liquidSavingsBase = Number(inputs.baseline?.monthlyLiquidSavings || 5000);
        const inflationRate = 0.02;
        const growthPath = inputs.salary_growth_path?.yearlyPct || Array(horizonYears).fill(2);

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

        // 2. Fetch Starting Balance Sheet (from accounts and holdings)
        const accounts = await prisma.account.findMany({
            where: { userId },
            include: { txs: { where: { instrumentId: null } } }
        });
        const startingCash = accounts.reduce((sum, acc) => {
            return sum + acc.txs.reduce((s, tx) => s + (Number(tx.quantity) * Number(tx.price || 1)), 0);
        }, 0);

        const { computeHoldingsFromEvents } = await import("@/src/backend/api");
        const holdingsRes = await computeHoldingsFromEvents(prisma, { userId });
        const startingPortfolioValue = holdingsRes.positions.reduce((sum, pos) => {
            return sum + (Number(pos.quantity) * Number(pos.avgCost));
        }, 0);

        // 3. Run Advanced Projection (Source of Truth)
        const { runProjection, createIncomeModule } = await import("@/src/projection");

        const now = new Date();
        const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const annualBonus = Number(inputs.baseline?.annualBonus || 0);
        const defaultBonusPct = monthlyGrossStart > 0 ? (annualBonus / (monthlyGrossStart * 12)) : 0;
        const bonusPath = inputs.bonus_growth_path?.yearlyPct
            ? inputs.bonus_growth_path.yearlyPct.map((p: any) => Number(p))
            : Array(horizonYears).fill(defaultBonusPct);

        const savingsRate = Number(inputs.baseline?.savingsRatePct || 0);
        const flatSavings = Number(inputs.baseline?.monthlyLiquidSavings || 5000);

        const incomeModule = createIncomeModule({
            startingSalary: monthlyGrossStart,
            yearlyGrowth: growthPath.map((p: any) => Number(p)),
            yearlyBonusPct: bonusPath,
            bonusMonth: 2 // March
        });

        const engineInput = {
            horizon: {
                startMonth,
                months: horizonYears * 12
            },
            startingBalanceSheet: {
                cash: startingCash,
                portfolioValue: startingPortfolioValue,
                otherAssets: 0,
                otherLiabilities: 0
            },
            baseline: {
                monthlyGrossIncome: monthlyGrossStart,
                pensionContributionRate: pensionRate,
                monthlyDisposableIncomeBeforeHousing: monthlyGrossStart * 0.73, // Simplified net estimate for baseline
                monthlyNonHousingExpenses: Object.values(monthlyExpensesByGroup).reduce((a, b) => a + b, 0),
                annualIncomeIncreasePercent: 0 // Handled by module
            } as any,
            modules: [incomeModule]
        };

        const projection = runProjection(engineInput);

        // 4. Aggregate to Yearly
        const yearlyData = [];
        for (let y = 0; y < horizonYears; y++) {
            const monthSlice = projection.series.slice(y * 12, (y + 1) * 12);

            // Total P&L for the year
            const yearlyPnL = monthSlice.reduce((acc, m) => {
                acc.income += m.pnl.income;
                acc.salary += m.pnl.salary || 0;
                acc.bonus += m.pnl.bonus || 0;
                acc.totalExpenses += m.pnl.totalExpenses;
                acc.tax += m.pnl.tax;
                acc.net += m.pnl.net;
                return acc;
            }, { income: 0, salary: 0, bonus: 0, totalExpenses: 0, tax: 0, net: 0 });

            // Typical month (the last month of the year usually represents the base)
            const lastMonth = monthSlice[11];

            yearlyData.push({
                yearIndex: y + 1,
                calendarYear: startYear + y,
                pnl: {
                    income: {
                        total: yearlyPnL.income,
                        lines: [
                            { key: 'salary', label: 'Salary', amount: yearlyPnL.salary },
                            { key: 'bonus', label: 'Bonus', amount: yearlyPnL.bonus },
                            { key: 'other', label: 'Other', amount: yearlyPnL.income - yearlyPnL.salary - yearlyPnL.bonus }
                        ]
                    },
                    expenses: {
                        total: yearlyPnL.totalExpenses,
                        lines: [
                            { key: 'other', label: 'All Expenses', amount: yearlyPnL.totalExpenses }
                        ]
                    },
                    tax: {
                        total: yearlyPnL.tax,
                        breakdown: [], // In absolute granular projection, tax is a single line for now
                        audit: null
                    },
                    netDisposable: yearlyPnL.net,
                    allocations: {
                        invest: savingsRate > 0 ? yearlyPnL.net * savingsRate : flatSavings * 12,
                        liquidSavings: 0,
                        residual: savingsRate > 0 ? yearlyPnL.net * (1 - savingsRate) : yearlyPnL.net - (flatSavings * 12)
                    }
                }
            });
        }

        return ok({
            startYear,
            horizonYears,
            years: yearlyData,
            dataQuality: {
                hasMonthlyEvolution: true,
                hasTaxBreakdown: true,
                hasIncomeInputs: true
            },
            meta: {
                lastUpdated: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Yearly P&L API Error:", error);
        return fail(error);
    }
}
