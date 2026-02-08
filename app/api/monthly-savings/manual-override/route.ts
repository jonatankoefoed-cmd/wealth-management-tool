import { setRecurringPlanManualExecutionPrice } from "@/src/backend";
import { fail, ok } from "@/app/api/_lib/response";

interface ManualOverrideBody {
  executionLineId: string;
  manualPrice: number;
  note?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ManualOverrideBody;
    const result = await setRecurringPlanManualExecutionPrice({
      executionLineId: body.executionLineId,
      manualPrice: body.manualPrice,
      note: body.note,
    });

    return ok({ result });
  } catch (error) {
    return fail(error, 400);
  }
}
