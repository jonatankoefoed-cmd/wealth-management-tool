import { getPriceQuote } from "@/src/pricing";
import { getExecutionDate, getTargetMonth } from "@/src/monthlySavings/schedule";
import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";

export async function GET(): Promise<Response> {
  try {
    const prisma = getPrismaClient();
    const userId = await requireDefaultUserId();

    const plan = await prisma.recurringInvestmentPlan.findFirst({
      where: { userId },
      include: {
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            instrument: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!plan) {
      return ok({ userId, plan: null, runs: [], lines: [] });
    }

    const runs = await prisma.executionRun.findMany({
      where: { planId: plan.id },
      orderBy: { scheduledDate: "desc" },
      take: 12,
      include: {
        lines: {
          orderBy: { weightPct: "desc" },
          include: {
            instrument: true,
          },
        },
      },
    });

    const currentTargetMonth = getTargetMonth(new Date());
    const executionDate = getExecutionDate(currentTargetMonth, plan.dayOfMonth);

    const lineQuotes = await Promise.all(
      plan.lines.map(async (line) => {
        const quote = await getPriceQuote({
          instrumentId: line.instrumentId,
          date: executionDate,
          currency: "DKK",
        });
        return {
          instrumentId: line.instrumentId,
          status: quote.status,
          price: quote.price,
          asOf: quote.asOf,
          source: quote.source,
          notes: quote.notes ?? null,
        };
      }),
    );

    return ok({
      userId,
      plan,
      executions: runs,
      lineQuotes,
      currentTargetMonth,
      executionDate: executionDate.toISOString(),
      educationalPanel: {
        title: "Shadow Execution",
        body: "Runs are paper executions: quantities are computed from plan weights and available prices, and every step is recorded in auditJson.",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
