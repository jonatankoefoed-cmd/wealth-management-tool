import { ok, fail } from "@/app/api/_lib/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { buildBudgetModel } from "@/lib/server/wealth-model";

export async function GET(): Promise<Response> {
  try {
    const prisma = getPrismaClient();
    const userId = await requireDefaultUserId();
    return ok(await buildBudgetModel(prisma, userId));
  } catch (error) {
    console.error("Budget API Error:", error);
    return fail(error);
  }
}
