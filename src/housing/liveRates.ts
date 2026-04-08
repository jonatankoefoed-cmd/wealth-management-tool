type TotalkreditProductType = "Obligationslån" | "FKort" | "TilpasningslånF5";

export interface LiveHousingRateRequest {
    propertyPrice: number;
    downPaymentCash: number;
    mortgageTermYears: number;
    mortgageInterestOnlyYears: number;
    bankLoanTermYears: number;
}

export interface LiveLoanOffer {
    productType: TotalkreditProductType;
    label: string;
    title: string;
    source: string;
    fallback: boolean;
    fetchedAt: string;
    loanType: string | null;
    rateAdjustment: string | null;
    nominalRatePct: number | null;
    debtorRatePct: number | null;
    contributionRatePct: number | null;
    effectiveRatePct: number | null;
    bondPrice: number | null;
    monthlyPaymentBeforeTax: number | null;
    monthlyPaymentAfterTax: number | null;
    monthlyContribution: number | null;
}

export interface LiveBankLoanBenchmark {
    source: string;
    methodology: string;
    referenceRatePct: number | null;
    assumedSpreadPct: number;
    indicativeRatePct: number | null;
}

export interface LiveHousingRatesResponse {
    fetchedAt: string;
    request: LiveHousingRateRequest;
    source: string;
    warnings: string[];
    offers: LiveLoanOffer[];
    bankLoanBenchmark: LiveBankLoanBenchmark;
}

const TOTALKREDIT_API_URL = "https://www.totalkredit.dk/api-v2/loan";
const TOTALKREDIT_SOURCE = "Totalkredit API v2 (offentlig beregner)";
const DEFAULT_BANK_SPREAD_PCT = 2.25;
const REQUEST_TIMEOUT_MS = 12_000;

const PRODUCT_LABELS: Record<TotalkreditProductType, string> = {
    Obligationslån: "Fast rente",
    FKort: "F-kort",
    TilpasningslånF5: "F5",
};

const FALLBACK_VALUES: Record<TotalkreditProductType, {
    nominalRatePct: number;
    debtorRatePct: number;
    contributionRatePct: number;
    effectiveRatePct: number;
    bondPrice: number;
}> = {
    Obligationslån: {
        nominalRatePct: 3.5,
        debtorRatePct: 3.55,
        contributionRatePct: 0.74,
        effectiveRatePct: 4.78,
        bondPrice: 96.53,
    },
    FKort: {
        nominalRatePct: 2.39,
        debtorRatePct: 2.41,
        contributionRatePct: 0.9,
        effectiveRatePct: 3.46,
        bondPrice: 100.23,
    },
    TilpasningslånF5: {
        nominalRatePct: 2.51,
        debtorRatePct: 2.53,
        contributionRatePct: 0.87,
        effectiveRatePct: 3.58,
        bondPrice: 93.7,
    },
};

const PRODUCTS: TotalkreditProductType[] = ["Obligationslån", "FKort", "TilpasningslånF5"];

export async function getLiveHousingRates(input: LiveHousingRateRequest): Promise<LiveHousingRatesResponse> {
    const normalizedInput = normalizeInput(input);
    const fetchedAt = new Date().toISOString();
    const warnings: string[] = [];

    const results = await Promise.allSettled(
        PRODUCTS.map((productType) => fetchTotalkreditOffer(productType, normalizedInput, fetchedAt))
    );

    const offers: LiveLoanOffer[] = [];
    results.forEach((result, index) => {
        const productType = PRODUCTS[index];
        if (result.status === "fulfilled") {
            offers.push(result.value);
            return;
        }
        warnings.push(`${PRODUCT_LABELS[productType]} kunne ikke hentes live.`);
        offers.push(createFallbackOffer(productType, fetchedAt));
    });

    const bankLoanBenchmark = deriveBankLoanBenchmark(offers);

    if (offers.every((offer) => offer.fallback)) {
        warnings.push("Alle live-kald fejlede. Viser fallback-værdier.");
    }

    return {
        fetchedAt,
        request: normalizedInput,
        source: TOTALKREDIT_SOURCE,
        warnings,
        offers,
        bankLoanBenchmark,
    };
}

async function fetchTotalkreditOffer(
    productType: TotalkreditProductType,
    input: LiveHousingRateRequest,
    fetchedAt: string
): Promise<LiveLoanOffer> {
    const params = new URLSearchParams({
        CollateralType: "Helaarsbolig",
        CollateralValue: String(input.propertyPrice),
        DownPayment: String(input.downPaymentCash),
        MortgageLoanInterestOnlyLength: String(input.mortgageInterestOnlyYears),
        MortgageLoanTenureLength: String(input.mortgageTermYears),
        ProductType: productType,
        ScenarioType: "1",
        BankLoanTenureLength: String(input.bankLoanTermYears),
        LiabilitySum: "",
        LoanAmount: "",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${TOTALKREDIT_API_URL}?${params.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Totalkredit svarede med status ${response.status}`);
        }

        const payload = await response.json() as unknown;
        return parseOfferFromPayload(payload, productType, fetchedAt);
    } finally {
        clearTimeout(timeout);
    }
}

function parseOfferFromPayload(
    payload: unknown,
    productType: TotalkreditProductType,
    fetchedAt: string
): LiveLoanOffer {
    const root = asRecord(payload);
    const errorValue = root?.error;
    if (typeof errorValue === "string" && errorValue.trim().length > 0) {
        throw new Error(errorValue);
    }

    const result = asRecord(root?.result);
    const mortgageLoan = asRecord(result?.MortgageLoan);
    const keyIndicators = asRecord(mortgageLoan?.KeyIndicators);

    return {
        productType,
        label: PRODUCT_LABELS[productType],
        title: readText(result, "Title") ?? PRODUCT_LABELS[productType],
        source: TOTALKREDIT_SOURCE,
        fallback: false,
        fetchedAt,
        loanType: readIndicatorText(keyIndicators, "LoanType"),
        rateAdjustment: readIndicatorText(keyIndicators, "RateAdjustment"),
        nominalRatePct: round2(readIndicatorNumber(keyIndicators, "CashInterestRate")),
        debtorRatePct: round2(readIndicatorNumber(keyIndicators, "InnerInterestGross")),
        contributionRatePct: round2(readIndicatorNumber(keyIndicators, "ComissionPercentage")),
        effectiveRatePct: round2(readIndicatorNumber(keyIndicators, "EffectiveInterestGross")),
        bondPrice: round2(readIndicatorNumber(keyIndicators, "BondPrice")),
        monthlyPaymentBeforeTax: round2(readIndicatorNumber(keyIndicators, "PaymentGrossMonthly")),
        monthlyPaymentAfterTax: round2(readIndicatorNumber(keyIndicators, "PaymentNetMonthly")),
        monthlyContribution: round2(readIndicatorNumber(keyIndicators, "CommissionMonthly")),
    };
}

function createFallbackOffer(productType: TotalkreditProductType, fetchedAt: string): LiveLoanOffer {
    const fallback = FALLBACK_VALUES[productType];
    return {
        productType,
        label: PRODUCT_LABELS[productType],
        title: `${PRODUCT_LABELS[productType]} (fallback)`,
        source: "Fallback (seneste kendte niveau)",
        fallback: true,
        fetchedAt,
        loanType: null,
        rateAdjustment: null,
        nominalRatePct: fallback.nominalRatePct,
        debtorRatePct: fallback.debtorRatePct,
        contributionRatePct: fallback.contributionRatePct,
        effectiveRatePct: fallback.effectiveRatePct,
        bondPrice: fallback.bondPrice,
        monthlyPaymentBeforeTax: null,
        monthlyPaymentAfterTax: null,
        monthlyContribution: null,
    };
}

function deriveBankLoanBenchmark(offers: LiveLoanOffer[]): LiveBankLoanBenchmark {
    const shortRate = offers.find((offer) => offer.productType === "FKort")?.nominalRatePct ?? null;
    const indicativeRatePct = shortRate === null
        ? null
        : round2(shortRate + DEFAULT_BANK_SPREAD_PCT);

    return {
        source: "Teknisk analyse af boligdata API'er + Totalkredit live reference",
        methodology: "Indikativ banklånsrente = F-kort rentesats + standard bankspænd.",
        referenceRatePct: shortRate,
        assumedSpreadPct: DEFAULT_BANK_SPREAD_PCT,
        indicativeRatePct,
    };
}

function normalizeInput(input: LiveHousingRateRequest): LiveHousingRateRequest {
    const propertyPrice = clampInt(input.propertyPrice, 500_000, 30_000_000, 3_500_000);
    const downPaymentCash = clampInt(input.downPaymentCash, 0, Math.round(propertyPrice * 0.95), 175_000);
    const mortgageTermYears = clampInt(input.mortgageTermYears, 10, 30, 30);
    const mortgageInterestOnlyYears = clampInt(input.mortgageInterestOnlyYears, 0, 10, 0);
    const bankLoanTermYears = clampInt(input.bankLoanTermYears, 5, 30, 20);

    return {
        propertyPrice,
        downPaymentCash,
        mortgageTermYears,
        mortgageInterestOnlyYears,
        bankLoanTermYears,
    };
}

function clampInt(raw: number, min: number, max: number, fallback: number): number {
    const candidate = Number.isFinite(raw) ? Math.round(raw) : fallback;
    return Math.max(min, Math.min(max, candidate));
}

function round2(value: number | null): number | null {
    if (value === null) return null;
    return Math.round(value * 100) / 100;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value === "object" && value !== null) {
        return value as Record<string, unknown>;
    }
    return null;
}

function readText(record: Record<string, unknown> | null, key: string): string | null {
    if (!record) return null;
    const raw = record[key];
    return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
}

function readIndicatorNumber(indicators: Record<string, unknown> | null, key: string): number | null {
    const indicator = asRecord(indicators?.[key]);
    if (!indicator) return null;
    return parseNumber(indicator["value"]);
}

function readIndicatorText(indicators: Record<string, unknown> | null, key: string): string | null {
    const indicator = asRecord(indicators?.[key]);
    if (!indicator) return null;
    const rawValue = indicator["value"];
    return typeof rawValue === "string" && rawValue.trim().length > 0 ? rawValue : null;
}

function parseNumber(raw: unknown): number | null {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw !== "string") return null;
    const normalized = Number(raw.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : null;
}
