import { fail, ok } from "@/app/api/_lib/response";
import { getLiveHousingRates } from "@/src/housing/liveRates";

const DEFAULTS = {
    propertyPrice: 3_500_000,
    downPaymentCash: 175_000,
    mortgageTermYears: 30,
    mortgageInterestOnlyYears: 0,
    bankLoanTermYears: 20,
} as const;

export async function GET(request: Request): Promise<Response> {
    try {
        const { searchParams } = new URL(request.url);
        const data = await getLiveHousingRates({
            propertyPrice: readNumber(searchParams, "price", DEFAULTS.propertyPrice),
            downPaymentCash: readNumber(searchParams, "downPayment", DEFAULTS.downPaymentCash),
            mortgageTermYears: readNumber(searchParams, "mortgageTermYears", DEFAULTS.mortgageTermYears),
            mortgageInterestOnlyYears: readNumber(searchParams, "mortgageIoYears", DEFAULTS.mortgageInterestOnlyYears),
            bankLoanTermYears: readNumber(searchParams, "bankTermYears", DEFAULTS.bankLoanTermYears),
        });

        return ok(data);
    } catch (error) {
        return fail(error, 500);
    }
}

function readNumber(searchParams: URLSearchParams, key: string, fallback: number): number {
    const raw = searchParams.get(key);
    if (raw === null) return fallback;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}
