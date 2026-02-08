import { computeDebtScheduleFromPostings } from "@/src/backend";
import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";

export async function GET(): Promise<Response> {
  try {
    const prisma = getPrismaClient();
    const userId = await requireDefaultUserId();

    const schedules = await computeDebtScheduleFromPostings(prisma, { userId });
    const debtAccounts = await prisma.debtAccount.findMany({
      where: { userId },
      include: {
        plan: true,
        postings: {
          orderBy: [{ date: "desc" }, { id: "desc" }],
          take: 60,
        },
      },
      orderBy: { name: "asc" },
    });

    return ok({
      userId,
      schedules,
      debtAccounts,
      warnings: [
        "Interest accrual engine for SU debt is pending; schedule reflects posted events currently stored in the ledger.",
      ],
    });
  } catch (error) {
    return fail(error);
  }
}
