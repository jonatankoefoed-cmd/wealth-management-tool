import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";
import { calculateTax } from "@/src/lib/tax";
import { computeHoldingsFromEvents } from "@/src/backend/api";

export async function GET(): Promise<Response> {
    try {
        const prisma = getPrismaClient();
        const userId = await requireDefaultUserId();

        // 1. Fetch Income Assumptions from Inputs/Scenario
        const scenario = await prisma.scenario.findFirst({
            where: { userId, isBase: true },
            include: { overrides: true },
        });

        const inputs = scenario?.overrides.reduce((acc, curr) => {
            acc[curr.key] = curr.valueJson;
            return acc;
        }, {} as Record<string, any>) || {};

        const monthlyGrossIncome = inputs.baseline?.monthlyGrossIncome || 65000; // Fallback
        const yearlyGrossIncome = monthlyGrossIncome * 12;

        // 2. Fetch Real Expenses
        const expenses = await prisma.expenseLine.findMany({
            where: { userId }
        });

        const expenseCategories = expenses.reduce((acc, exp) => {
            const amount = Number(exp.amount);
            // Normalize to monthly
            let monthlyAmount = amount;
            if (exp.frequency === "YEARLY") monthlyAmount = amount / 12;
            if (exp.frequency === "QUARTERLY") monthlyAmount = amount / 3;

            acc[exp.category] = (acc[exp.category] || 0) + monthlyAmount;
            return acc;
        }, {} as Record<string, number>);

        const totalMonthlyExpenses = Object.values(expenseCategories).reduce((sum, val) => sum + val, 0);

        // 3. Fetch Investment Data for Tax (ASK interest/gains)
        // Simplified for Budget view: we look at ASK balances if available
        const holdingsRes = await computeHoldingsFromEvents(prisma, { userId });
        const askPositions = holdingsRes.positions.filter(p => p.accountName.toUpperCase().includes("ASK"));
        // For simplicity in current run-rate, we might assume 0 realized gains unless we check txs for the year.
        // User wants "This Year run-rate".

        // 4. Calculate Tax
        const taxInput = {
            taxYear: 2026,
            municipality: { rate: 0.2505, churchRate: 0.007 }, // Default Copenhagen approx
            isMarried: false,
            personalIncome: {
                salaryGross: yearlyGrossIncome,
                atp: 1135, // Approx annual standard
            },
            investments: {
                // ASK tax is handled separately in engine, usually 17% of gains.
                // For a "Budget" we might just show income tax.
            }
        };

        const taxResult = calculateTax(taxInput);

        const yearlyTax = taxResult.totals.totalTax;
        const monthlyTax = yearlyTax / 12;

        const netDisposableMonthly = monthlyGrossIncome - monthlyTax - totalMonthlyExpenses;

        return ok({
            year: 2026,
            income: {
                monthlyGross: monthlyGrossIncome,
                yearlyGross: yearlyGrossIncome,
                source: scenario ? "Base Scenario" : "Default Assumption"
            },
            expenses: {
                monthlyTotal: totalMonthlyExpenses,
                yearlyTotal: totalMonthlyExpenses * 12,
                categories: expenseCategories,
                count: expenses.length
            },
            tax: {
                monthlyTotal: monthlyTax,
                yearlyTotal: yearlyTax,
                breakdown: taxResult.breakdown,
                audit: taxResult.summaryAudit
            },
            net: {
                monthlyDisposable: netDisposableMonthly,
                yearlyDisposable: netDisposableMonthly * 12
            }
        });

    } catch (error) {
        console.error("Budget API Error:", error);
        return fail(error);
    }
}
