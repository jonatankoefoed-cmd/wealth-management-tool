"use server";

import YahooFinance from "yahoo-finance2";
import { getPrismaClient } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AssetType } from "@prisma/client";
import { fetchBinanceQuotes, toBinanceSymbol } from "@/src/lib/prices/binanceClient";

interface PriceUpdateResult {
    symbol: string;
    status: "success" | "failed";
    price?: number;
    currency?: string;
    error?: string;
}

interface InstrumentForLookup {
    ticker: string | null;
    isin: string | null;
    name: string;
    assetType: AssetType;
    currency: string | null;
}

interface ResolvedQuote {
    symbol: string;
    price: number;
    currency?: string;
}

interface SearchCandidate {
    symbol: string;
    exchange?: string;
    quoteType?: string;
    shortname?: string;
    longname?: string;
    fromTicker: boolean;
    fromName: boolean;
    fromIsin: boolean;
}

const CRYPTO_TICKERS = new Set([
    "BTC", "ETH", "SOL", "AVAX", "DOT", "USDT", "LUNA", "LUNC",
    "PEPE", "XRP", "ADA", "DOGE", "ALGO", "BETH", "EUR"
]);

const yahooFinance = new YahooFinance({
    suppressNotices: ["yahooSurvey"],
});

function normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9æøå]+/g, " ").trim();
}

function nameMatchCount(left: string, right: string): number {
    const leftTokens = new Set(normalizeText(left).split(" ").filter((t) => t.length > 2));
    const rightTokens = new Set(normalizeText(right).split(" ").filter((t) => t.length > 2));

    let matches = 0;
    for (const token of leftTokens) {
        if (rightTokens.has(token)) matches++;
    }
    return matches;
}

function isLikelyCryptoTicker(ticker: string | null, name: string): boolean {
    const clean = (ticker ?? "").trim().toUpperCase();
    if (CRYPTO_TICKERS.has(clean)) return true;
    return /(bitcoin|ethereum|crypto|krypto|solana|cardano|algorand|tether)/i.test(name);
}

function mapTicker(
    ticker: string | null,
    _isin: string | null,
    name: string,
    assetType: AssetType,
    currency: string | null
): string | null {
    if (!ticker) return null;

    const cleanTicker = ticker.trim().toUpperCase();

    // 1. Manual overrides
    if (cleanTicker === "NOVO-B") return "NOVO-B.CO";
    if (cleanTicker === "EUNL") return "EUNL.DE";
    if (cleanTicker.includes("PNDORA")) return "PNDORA.CO";
    if (cleanTicker.includes("DANSKE")) return "DANSKE.CO";
    if (cleanTicker.includes("DSV")) return "DSV.CO";
    if (cleanTicker.includes("CARL-B")) return "CARL-B.CO";
    if (cleanTicker.includes("TRYG")) return "TRYG.CO";
    if (cleanTicker.includes("MAERSK-B")) return "MAERSK-B.CO";
    if (cleanTicker.includes("VWS")) return "VWS.CO";
    if (cleanTicker.includes("ORSTED")) return "ORSTED.CO";
    if (cleanTicker.includes("COLOP-B")) return "COLOP-B.CO";
    if (cleanTicker.includes("JYSK")) return "JYSK.CO";
    if (cleanTicker.includes("GN")) return "GN.CO";
    if (cleanTicker.includes("ISS")) return "ISS.CO";
    if (cleanTicker.includes("DEMANT")) return "DEMANT.CO";
    if (cleanTicker.includes("AMBU-B")) return "AMBU-B.CO";
    if (cleanTicker.includes("NZYM-B")) return "NZYM-B.CO";
    if (cleanTicker.includes("ROCK-B")) return "ROCK-B.CO";
    if (cleanTicker.includes("BAVA")) return "BAVA.CO";
    if (cleanTicker.includes("SYDB")) return "SYDB.CO";
    if (cleanTicker.includes("NETC")) return "NETC.CO";
    if (cleanTicker.includes("ALK-B")) return "ALK-B.CO";
    if (cleanTicker.includes("ZEAL")) return "ZEAL.CO";
    if (cleanTicker.includes("TORM")) return "TRMD-A.CO"; // Torm plc A
    if (cleanTicker.includes("STG")) return "STG.CO";
    if (cleanTicker.includes("DFDS")) return "DFDS.CO";
    if (cleanTicker.includes("FLS")) return "FLS.CO";
    if (cleanTicker.includes("SPNO")) return "SPNO.CO";
    if (cleanTicker.includes("CHEMM")) return "CHEMM.CO";
    if (cleanTicker.includes("TRMD-A")) return "TRMD-A.CO";
    if (cleanTicker.includes("RBREW")) return "RBREW.CO";
    if (cleanTicker.includes("SOLAR-B")) return "SOLAR-B.CO";

    // 2. Generic rules
    if (isLikelyCryptoTicker(cleanTicker, name)) {
        return `${cleanTicker}-USD`;
    }

    if (cleanTicker.startsWith("CPH:")) {
        return `${cleanTicker.replace("CPH:", "")}.CO`;
    }

    if (cleanTicker.startsWith("XET:")) {
        return `${cleanTicker.replace("XET:", "")}.DE`;
    }

    if (cleanTicker.startsWith("NAS:") || cleanTicker.startsWith("NYQ:")) {
        return cleanTicker.split(":")[1];
    }

    if (assetType === AssetType.STOCK && !cleanTicker.includes(".")) {
        if (currency === "DKK") return `${cleanTicker}.CO`;
        if (currency === "SEK") return `${cleanTicker}.ST`;
        if (currency === "NOK") return `${cleanTicker}.OL`;
    }

    return cleanTicker;
}

async function fetchQuoteBySymbol(symbol: string): Promise<ResolvedQuote | null> {
    try {
        const quote = await yahooFinance.quote(
            symbol,
            undefined,
            { validateResult: false } as any
        ) as any;

        const price = Number(quote?.regularMarketPrice);
        if (!Number.isFinite(price) || price <= 0) {
            return null;
        }

        return {
            symbol,
            price,
            currency: quote?.currency,
        };
    } catch {
        return null;
    }
}

function scoreSearchCandidate(candidate: SearchCandidate, instrument: InstrumentForLookup): number {
    const ticker = (instrument.ticker ?? "").trim().toUpperCase();
    const symbol = candidate.symbol.toUpperCase();
    const quoteType = (candidate.quoteType ?? "").toUpperCase();
    const exchange = (candidate.exchange ?? "").toUpperCase();

    let score = 0;

    if (ticker) {
        if (symbol === ticker) score += 120;
        if (symbol.startsWith(`${ticker}.`)) score += 100;
        if (symbol.includes(ticker)) score += 35;
    }

    if (candidate.fromTicker) score += 18;
    if (candidate.fromName) score += 10;
    if (candidate.fromIsin) score += 4;

    const nameScore = nameMatchCount(instrument.name, `${candidate.longname ?? ""} ${candidate.shortname ?? ""}`);
    score += nameScore * 12;
    if (nameScore === 0) score -= 24;
    if (candidate.fromIsin && nameScore < 2) score -= 60;

    const preferredExchangesByCurrency: Record<string, string[]> = {
        DKK: ["CPH"],
        SEK: ["STO"],
        NOK: ["OSL"],
        EUR: ["PAR", "GER", "AMS", "MIL", "EBS", "LSE", "FRA", "MUN", "HAM", "HAN", "DUS", "STU"],
        USD: ["NMS", "NYQ", "ASE", "PCX", "NCM", "NGM"],
    };
    const preferred = preferredExchangesByCurrency[instrument.currency ?? ""] ?? [];
    if (preferred.includes(exchange)) score += 15;

    if (["ETF", "EQUITY", "MUTUALFUND", "CRYPTOCURRENCY"].includes(quoteType)) {
        score += 8;
    } else {
        score -= 10;
    }

    if (isLikelyCryptoTicker(instrument.ticker, instrument.name)) {
        if (quoteType === "CRYPTOCURRENCY" || symbol.endsWith("-USD")) {
            score += 70;
        } else {
            score -= 80;
        }
    }

    return score;
}

function addSearchCandidate(
    map: Map<string, SearchCandidate>,
    raw: any,
    source: "ticker" | "name" | "isin"
) {
    const symbol = typeof raw?.symbol === "string" ? raw.symbol.trim() : "";
    if (!symbol) return;

    const existing = map.get(symbol);
    if (existing) {
        if (source === "ticker") existing.fromTicker = true;
        if (source === "name") existing.fromName = true;
        if (source === "isin") existing.fromIsin = true;
        return;
    }

    map.set(symbol, {
        symbol,
        exchange: raw?.exchange,
        quoteType: raw?.quoteType,
        shortname: raw?.shortname,
        longname: raw?.longname,
        fromTicker: source === "ticker",
        fromName: source === "name",
        fromIsin: source === "isin",
    });
}

async function resolveQuote(instrument: InstrumentForLookup): Promise<ResolvedQuote | null> {
    const primaryTicker = mapTicker(
        instrument.ticker,
        instrument.isin,
        instrument.name,
        instrument.assetType,
        instrument.currency
    );

    const directCandidates = new Set<string>();
    if (primaryTicker) directCandidates.add(primaryTicker);

    const rawTicker = instrument.ticker?.trim().toUpperCase();
    if (rawTicker) directCandidates.add(rawTicker);

    for (const symbol of directCandidates) {
        const quote = await fetchQuoteBySymbol(symbol);
        if (quote) return quote;
    }

    const searchCandidates = new Map<string, SearchCandidate>();
    const searchQueries: Array<{ source: "ticker" | "name" | "isin"; value: string }> = [];

    if (rawTicker) searchQueries.push({ source: "ticker", value: rawTicker });
    if (instrument.name.trim().length > 0) searchQueries.push({ source: "name", value: instrument.name.trim() });
    if (instrument.isin?.trim()) searchQueries.push({ source: "isin", value: instrument.isin.trim() });

    for (const query of searchQueries) {
        try {
            const searchResult = await yahooFinance.search(query.value) as any;
            const quotes = Array.isArray(searchResult?.quotes) ? searchResult.quotes.slice(0, 12) : [];
            for (const raw of quotes) {
                addSearchCandidate(searchCandidates, raw, query.source);
            }
        } catch {
            // Ignore search errors and continue with available candidates.
        }
    }

    const rankedCandidates = Array.from(searchCandidates.values())
        .map((candidate) => ({
            symbol: candidate.symbol,
            score: scoreSearchCandidate(candidate, instrument),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    for (const candidate of rankedCandidates) {
        const quote = await fetchQuoteBySymbol(candidate.symbol);
        if (quote) return quote;
    }

    return null;
}

export async function refreshPrices(): Promise<{
    success: boolean;
    results: PriceUpdateResult[];
    count: number;
}> {
    const prisma = getPrismaClient();

    try {
        // 1. Fetch all instruments with a ticker or ISIN
        const instruments = await prisma.instrument.findMany({
            where: {
                OR: [
                    { ticker: { not: null } },
                    { isin: { not: null } }
                ]
            }
        });

        if (instruments.length === 0) {
            return { success: true, results: [], count: 0 };
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const results: PriceUpdateResult[] = [];
        let successCount = 0;

        // 2. Separate crypto from others
        const cryptoInstruments = instruments.filter(i => isLikelyCryptoTicker(i.ticker, i.name));
        const otherInstruments = instruments.filter(i => !isLikelyCryptoTicker(i.ticker, i.name));

        // 3. Process Crypto using Binance (Fast & Real-time)
        if (cryptoInstruments.length > 0) {
            try {
                const tickerToId = new Map(cryptoInstruments.map(i => [toBinanceSymbol(i.ticker!), i.id]));
                const symbols = Array.from(tickerToId.keys());
                const quotes = await fetchBinanceQuotes(symbols);

                for (const instrument of cryptoInstruments) {
                    const binanceSymbol = toBinanceSymbol(instrument.ticker!);
                    const quote = quotes.get(binanceSymbol);

                    if (quote) {
                        const existing = await prisma.price.findFirst({
                            where: { instrumentId: instrument.id, date: today }
                        });

                        const data = {
                            instrumentId: instrument.id,
                            date: today,
                            close: quote.price,
                            currency: quote.currency || "USD",
                            source: "binance"
                        };

                        if (existing) {
                            await prisma.price.update({ where: { id: existing.id }, data });
                        } else {
                            await prisma.price.create({ data });
                        }

                        results.push({
                            symbol: instrument.ticker || instrument.name,
                            status: "success",
                            price: quote.price,
                            currency: quote.currency || "USD"
                        });
                        successCount++;
                    } else {
                        results.push({
                            symbol: instrument.ticker || instrument.name,
                            status: "failed",
                            error: "Binance quote not found"
                        });
                    }
                }
            } catch (err: any) {
                console.error("Binance refresh failed:", err);
            }
        }

        // 4. Process Others using Yahoo Finance
        for (const instrument of otherInstruments) {
            const fallbackSymbol = instrument.ticker?.trim().toUpperCase() || instrument.name;
            try {
                const resolved = await resolveQuote({
                    ticker: instrument.ticker,
                    isin: instrument.isin,
                    name: instrument.name,
                    assetType: instrument.assetType,
                    currency: instrument.currency,
                });

                if (!resolved) {
                    results.push({ symbol: fallbackSymbol, status: "failed", error: "Could not resolve Yahoo symbol" });
                    continue;
                }

                const price = resolved.price;
                const currency = resolved.currency;

                const existing = await prisma.price.findFirst({
                    where: { instrumentId: instrument.id, date: today }
                });

                const data = {
                    instrumentId: instrument.id,
                    date: today,
                    close: price,
                    currency: currency || instrument.currency || "DKK",
                    source: "yahoo",
                };

                if (existing) {
                    await prisma.price.update({ where: { id: existing.id }, data });
                } else {
                    await prisma.price.create({ data });
                }

                results.push({
                    symbol: resolved.symbol,
                    status: "success",
                    price,
                    currency: currency || instrument.currency || "DKK"
                });
                successCount++;
            } catch (err: any) {
                results.push({ symbol: fallbackSymbol, status: "failed", error: err?.message ?? "Unknown error" });
            }
        }

        try {
            revalidatePath("/(dashboard)/portfolio", "page");
            revalidatePath("/(dashboard)/overview", "page");
        } catch {
            // Ignore revalidation errors in scripts
        }

        return { success: true, results, count: successCount };
    } catch (error) {
        console.error("Price refresh failed:", error);
        return { success: false, results: [], count: 0 };
    }
}
