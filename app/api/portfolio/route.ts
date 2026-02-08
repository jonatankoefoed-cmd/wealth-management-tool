import { computeHoldingsFromEvents } from "@/src/backend";
import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";

function numeric(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

export async function GET(): Promise<Response> {
  try {
    const prisma = getPrismaClient();
    const userId = await requireDefaultUserId();
    const holdings = await computeHoldingsFromEvents(prisma, { userId });

    const rows = await Promise.all(
      holdings.positions.map(async (position) => {
        const latestPrice = await prisma.price.findFirst({
          where: { instrumentId: position.instrumentId },
          orderBy: { date: "desc" },
        });

        const quantity = numeric(position.quantity);
        const avgCost = numeric(position.avgCost);
        const price = latestPrice ? numeric(latestPrice.close.toString()) : null;

        return {
          ...position,
          quantity,
          avgCost,
          latestPrice: price,
          priceSource: latestPrice?.source ?? "missing",
          priceDate: latestPrice?.date.toISOString() ?? null,
          marketValue: price === null ? null : quantity * price,
        };
      }),
    );

    const importJobs = await prisma.importJob.findMany({
      where: { userId },
      orderBy: { importedAt: "desc" },
      take: 6,
    });

    return ok({
      userId,
      asOfDate: holdings.asOfDate,
      baselineSnapshotId: holdings.baselineSnapshotId,
      rows,
      warnings: holdings.warnings,
      audits: holdings.audits,
      importJobs,
      empty: rows.length === 0,
      missingPrices: rows.filter((row) => row.latestPrice === null).length,
    });
  } catch (error) {
    return fail(error);
  }
}
