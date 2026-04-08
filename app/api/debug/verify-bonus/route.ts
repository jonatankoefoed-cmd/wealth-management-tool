
import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const prisma = getPrismaClient();
        const userId = await requireDefaultUserId();

        const scenario = await prisma.scenario.findFirst({
            where: { userId, isBase: true },
            include: { overrides: true }
        });

        if (!scenario) {
            return NextResponse.json({ error: "No scenario found" });
        }

        const overrides = scenario.overrides.reduce((acc, curr) => {
            acc[curr.key] = curr.valueJson;
            return acc;
        }, {} as Record<string, any>);

        return NextResponse.json({
            baseline: overrides.baseline,
            bonus_growth_path: overrides.bonus_growth_path,
            salary_growth_path: overrides.salary_growth_path
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
