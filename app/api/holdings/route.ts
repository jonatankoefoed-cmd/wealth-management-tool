import { getPrismaClient } from "@/lib/prisma";
import { requireDefaultUserId } from "@/lib/server/user";
import { fail, ok } from "@/app/api/_lib/response";
import { loadHoldingsSnapshot } from "@/lib/server/wealth-model";

export async function GET(): Promise<Response> {
  try {
    const prisma = getPrismaClient();
    const userId = await requireDefaultUserId();
    return ok(await loadHoldingsSnapshot(prisma, userId));
  } catch (error) {
    console.error("Holdings API Error:", error);
    return fail(error);
  }
}
