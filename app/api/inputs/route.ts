import { prisma } from "@/src/lib/db";
import { fail, ok } from "@/app/api/_lib/response";
import { createDefaultHousingInput, normalizeHousingInput } from "@/src/housing/defaults";

export async function GET(): Promise<Response> {
    try {
        // TODO: proper auth
        const user = await prisma.user.findFirst();
        if (!user) return fail("No user found", 404);

        const scenario = await prisma.scenario.findFirst({
            where: { userId: user.id, isBase: true },
            include: { overrides: true },
        });

        if (!scenario) {
            // Return default minimal structure if no Base Scenario exists
            return ok({
                salary_growth_path: { model: 'standard', yearlyPct: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03] },
                return_assumptions: { equityPct: 0.07, bondPct: 0.03 },
                housing: createDefaultHousingInput(2026),
                baseline: {
                    monthlyDisposableIncomeBeforeHousing: 35000,
                    monthlyNonHousingExpenses: 20000,
                    annualBonus: 50000,
                    retirementAge: 67,
                    municipality: 'København',
                    maritalStatus: 'single',
                    expenseInflationRate: 0.02,
                    monthlyLiquidSavings: 5000
                },
                investmentStrategy: 'simple',
                rebalancingFrequency: 'yearly',
                mortgage_assumptions: {
                    interestRate: 0.04,
                    years: 30,
                    interestOnly: false
                },
                events: []
            });
        }

        // Transform overrides array { key, valueJson } into a single object
        const inputs = scenario.overrides.reduce((acc, curr) => {
            acc[curr.key] = curr.valueJson;
            return acc;
        }, {} as Record<string, any>);

        inputs.housing = normalizeHousingInput(inputs.housing ?? createDefaultHousingInput(2026));

        return ok(inputs);
    } catch (error) {
        return fail(error);
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const body = await request.json();
        if (body?.housing) {
            body.housing = normalizeHousingInput(body.housing);
        }
        const user = await prisma.user.findFirst();
        if (!user) return fail("No user found", 404);

        // Upsert Base Scenario
        const scenario = await prisma.scenario.upsert({
            where: {
                // We don't have a unique constraint on (userId, isBase) but logic enforces it.
                // For now, find first or create. simpler to just find first.
                id: (await prisma.scenario.findFirst({ where: { userId: user.id, isBase: true } }))?.id ?? "new"
            },
            update: {},
            create: {
                userId: user.id,
                name: "Base Scenario",
                isBase: true,
            }
        });

        // Upsert overrides
        const updates = Object.entries(body).map(([key, value]) => {
            return prisma.scenarioOverride.upsert({
                where: {
                    scenarioId_key: {
                        scenarioId: scenario.id,
                        key: key,
                    },
                },
                update: { valueJson: value as any },
                create: {
                    scenarioId: scenario.id,
                    key: key,
                    valueJson: value as any,
                },
            });
        });

        await Promise.all(updates);

        return ok({ success: true });
    } catch (error) {
        return fail(error);
    }
}
