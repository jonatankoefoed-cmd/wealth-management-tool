import { computeDebtScheduleFromPostings, computeHoldingsFromEvents } from "@/src/backend";
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
    const positionsWithPrices = await Promise.all(
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
          latestPrice: price,
          priceAsOf: latestPrice?.date.toISOString() ?? null,
          marketValue: quantity * (price ?? avgCost),
          usedFallbackPrice: price === null,
        };
      }),
    );

    const portfolioValue = positionsWithPrices.reduce((sum, row) => sum + row.marketValue, 0);

    const cashTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        account: { is: { type: "CASH" } },
      },
      select: {
        amount: true,
        quantity: true,
        price: true,
      },
    });

    const cashValue = cashTransactions.reduce((sum, tx) => {
      if (tx.amount !== null) {
        return sum + numeric(tx.amount.toString());
      }
      if (tx.quantity !== null && tx.price !== null) {
        return sum + numeric(tx.quantity.toString()) * numeric(tx.price.toString());
      }
      return sum;
    }, 0);

    const debtSchedules = await computeDebtScheduleFromPostings(prisma, { userId });
    const debtValue = debtSchedules.reduce((sum, schedule) => {
      if (schedule.rows.length === 0) {
        return sum;
      }
      const lastRow = schedule.rows[schedule.rows.length - 1];
      return sum + numeric(lastRow.closingBalance);
    }, 0);

    const netWorth = cashValue + portfolioValue - debtValue;

    const latestImportJob = await prisma.importJob.findFirst({
      where: { userId },
      orderBy: { importedAt: "desc" },
    });

    const latestMonthlyExecution = await prisma.executionRun.findFirst({
      orderBy: [{ executedAt: "desc" }, { scheduledDate: "desc" }],
      include: {
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const netWorthAudit = {
      title: "Net Worth Snapshot",
      context: {
        userId,
        generatedAt: new Date().toISOString(),
      },
      steps: [
        {
          label: "Cash",
          formula: "sum(cash account transaction amounts)",
          value: cashValue,
          unit: "DKK",
        },
        {
          label: "Portfolio",
          formula: "sum(position quantity × latest or fallback price)",
          value: portfolioValue,
          unit: "DKK",
        },
        {
          label: "Debt",
          formula: "sum(latest closing balance per debt account)",
          value: debtValue,
          unit: "DKK",
        },
        {
          label: "Net Worth",
          formula: "cash + portfolio - debt",
          value: netWorth,
          unit: "DKK",
        },
      ],
      notes: [
        positionsWithPrices.some((row) => row.usedFallbackPrice)
          ? "At least one portfolio row used avg cost as fallback due to missing market price."
          : "All positions used a market price from cache.",
      ],
    };

    return ok({
      userId,
      netWorth,
      cashValue,
      portfolioValue,
      debtValue,
      holdingsWarnings: holdings.warnings,
      latestImportJob,
      latestMonthlyExecution,
      status: {
        imports: latestImportJob?.status ?? "FAILED",
        monthlySavings: latestMonthlyExecution?.status ?? "FAILED",
      },
      audits: {
        netWorth: netWorthAudit,
        holdings: holdings.audits[0] ?? null,
        debt: debtSchedules[0]?.audits[0] ?? null,
      },
    });
  } catch (error) {
    return fail(error);
  }
}
