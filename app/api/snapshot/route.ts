import { fail, ok } from "@/app/api/_lib/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { loadHoldingsSnapshot } from "@/lib/server/wealth-model";

export async function GET(): Promise<Response> {
  try {
    const prisma = getPrismaClient();
    const userId = await requireDefaultUserId();
    const holdingsSnapshot = await loadHoldingsSnapshot(prisma, userId);

    return ok({
      cash: holdingsSnapshot.totals.cashDKK,
      holdings: holdingsSnapshot.positions.map((position) => ({
        id: position.instrumentId,
        name: position.name,
        quantity: position.quantity,
        avgCost: position.avgCost,
        valueDKK: position.valueDKK,
        ticker: position.ticker,
      })),
      debts: holdingsSnapshot.debts,
      asOf: holdingsSnapshot.asOfDate,
    });
  } catch (error) {
    return fail(error);
  }
}
