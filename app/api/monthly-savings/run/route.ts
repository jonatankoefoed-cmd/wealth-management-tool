import { executeRecurringPlanRun } from "@/src/backend";
import { fail, ok } from "@/app/api/_lib/response";

interface ExecuteRunBody {
  planId: string;
  targetMonth: string;
  force?: boolean;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ExecuteRunBody;
    const result = await executeRecurringPlanRun({
      planId: body.planId,
      targetMonth: body.targetMonth,
      force: body.force,
    });

    return ok({ result });
  } catch (error) {
    return fail(error, 400);
  }
}
