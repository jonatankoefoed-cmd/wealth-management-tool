import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";
import { buildForecastModel, loadHoldingsSnapshot } from "@/lib/server/wealth-model";

export async function GET(): Promise<Response> {
  try {
    const prisma = getPrismaClient();
    const userId = await requireDefaultUserId();

    const [forecast, holdingsSnapshot, latestImportJob] = await Promise.all([
      buildForecastModel(prisma, userId),
      loadHoldingsSnapshot(prisma, userId),
      prisma.importJob.findFirst({
        where: { userId },
        orderBy: { importedAt: "desc" },
      }),
    ]);

    return ok({
      userId,
      asOfDate: holdingsSnapshot.asOfDate,
      snapshot: holdingsSnapshot.totals,
      summary: forecast.summary,
      scenarioMeta: forecast.scenarioMeta,
      latestImportJob,
      status: {
        imports: latestImportJob?.status ?? "FAILED",
        hasHoldings: holdingsSnapshot.status.hasHoldings,
        missingPrices: holdingsSnapshot.status.missingPrices,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
