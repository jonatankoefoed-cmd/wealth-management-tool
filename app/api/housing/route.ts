import { simulateHomePurchase, type HousingPurchaseInput } from "@/src/housing";
import { loadHousingRules } from "@/src/housing/rules.server";
import { fail, ok } from "@/app/api/_lib/response";
import { createDefaultHousingInput, normalizeHousingInput } from "@/src/housing/defaults";

function defaultInput(year = 2026): HousingPurchaseInput {
  return normalizeHousingInput(createDefaultHousingInput(year));
}

function loadRulesOrExample(year: number) {
  try {
    return loadHousingRules(year);
  } catch {
    return loadHousingRules(year, { useExample: true });
  }
}

export async function GET(): Promise<Response> {
  try {
    const input = defaultInput();
    const rules = loadRulesOrExample(input.year);
    const output = simulateHomePurchase(input, rules);

    return ok({
      defaults: input,
      rulesYear: rules.year,
      output,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = normalizeHousingInput((await request.json()) as HousingPurchaseInput);
    const rules = loadRulesOrExample(body.year ?? 2026);
    const output = simulateHomePurchase(body, rules);

    return ok({
      input: body,
      rulesYear: rules.year,
      output,
    });
  } catch (error) {
    return fail(error, 400);
  }
}
