import { updateRecurringPlan } from "@/src/backend";
import { getPrismaClient } from "@/lib/prisma";
import { fail, ok } from "@/app/api/_lib/response";

interface UpdatePlanBody {
  planId: string;
  amountDkk?: number;
  dayOfMonth?: number;
  name?: string | null;
  status?: "ACTIVE" | "PAUSED";
  lines?: Array<{
    instrumentId: string;
    weightPct: number;
    sortOrder?: number;
  }>;
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const prisma = getPrismaClient();
    const body = (await request.json()) as UpdatePlanBody;

    const updated = await updateRecurringPlan(prisma, {
      planId: body.planId,
      amountDkk: body.amountDkk,
      dayOfMonth: body.dayOfMonth,
      name: body.name,
      status: body.status,
      lines: body.lines,
    });

    return ok({ updated });
  } catch (error) {
    return fail(error, 400);
  }
}
