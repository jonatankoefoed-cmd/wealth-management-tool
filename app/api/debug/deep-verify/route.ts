
import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const prisma = getPrismaClient();
        const userId = await requireDefaultUserId();

        // 1. Fetch Inputs (Same as route.ts)
        const scenario = await prisma.scenario.findFirst({
            where: { userId, isBase: true },
            include: { overrides: true },
        });

        const inputs = scenario?.overrides.reduce((acc, curr) => {
            acc[curr.key] = curr.valueJson;
            return acc;
        }, {} as Record<string, any>) || {};

        const monthlyGrossStart = Number(inputs.baseline?.monthlyGrossIncome || 65000);
        const annualBonus = Number(inputs.baseline?.annualBonus || 0);
        const horizonYears = 10;

        // Bonus Logic
        const defaultBonusPct = monthlyGrossStart > 0 ? (annualBonus / (monthlyGrossStart * 12)) : 0;
        const bonusPath = inputs.bonus_growth_path?.yearlyPct
            ? inputs.bonus_growth_path.yearlyPct.map((p: any) => Number(p))
            : Array(horizonYears).fill(defaultBonusPct);

        // Import Engine
        const { createIncomeModule, runProjection } = await import("@/src/projection");

        const incomeModule = createIncomeModule({
            startingSalary: monthlyGrossStart,
            yearlyGrowth: (inputs.salary_growth_path?.yearlyPct || []).map((p: any) => Number(p)),
            yearlyBonusPct: bonusPath,
            bonusMonth: 2 // March
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

        const projection = runProjection(engineInput as any);

        // Sample Year 1 (Index 0-11)
        const year1 = projection.series.slice(0, 12).map(m => ({
            month: m.month,
            salary: m.pnl.salary,
            bonus: m.pnl.bonus,
            income: m.pnl.income
        }));

        return NextResponse.json({
            inputs_baseline: inputs.baseline,
            calculated: {
                monthlyGrossStart,
                annualBonus,
                defaultBonusPct,
                bonusPath_sample: bonusPath.slice(0, 3)
            },
            year1_sample: year1
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
