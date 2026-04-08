/**
 * Yahoo Finance Client
 * 
 * Fetches stock and ETF prices from Yahoo Finance via yahoo-finance2 library.
 * Handles Danish stocks with .CO suffix for Copenhagen exchange.
 * 
 * Note: Data is delayed ~15 minutes (standard for free tier).
 */

import type { PriceQuote } from './types';

// yahoo-finance2 types (simplified for our use case)
interface YahooQuote {
    symbol: string;
    regularMarketPrice: number;
    regularMarketChange: number;
    regularMarketChangePercent: number;
    regularMarketTime: Date;
    currency: string;
}

type YahooFinanceClient = {
    quote: (ticker: string | string[]) => Promise<YahooQuote | YahooQuote[]>;
    search: (query: string) => Promise<{ quotes?: unknown[] }>;
};

let yahooClientPromise: Promise<YahooFinanceClient> | null = null;

async function getYahooClient(): Promise<YahooFinanceClient> {
    if (!yahooClientPromise) {
        yahooClientPromise = import('yahoo-finance2').then((m) => {
            const YahooFinanceCtor = m.default;
            return new YahooFinanceCtor({
                suppressNotices: ['yahooSurvey'],
            }) as YahooFinanceClient;
        });
    }
    return yahooClientPromise;
}

/**
 * Fetch a single quote from Yahoo Finance.
 */
export async function fetchYahooQuote(ticker: string): Promise<PriceQuote | null> {
    try {
        const yahooFinance = await getYahooClient();

        const quote = await yahooFinance.quote(ticker) as YahooQuote;

        if (!quote || !quote.regularMarketPrice) {
            console.warn(`No quote data for ${ticker}`);
            return null;
        }

        return {
            ticker,
            price: quote.regularMarketPrice,
            currency: quote.currency || 'USD',
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            timestamp: quote.regularMarketTime || new Date(),
            delayed: true, // Yahoo is always delayed ~15 min
            source: 'yahoo',
        };
    } catch (error) {
        console.error(`Error fetching Yahoo quote for ${ticker}:`, error);
        return null;
    }
}

/**
 * Fetch multiple quotes from Yahoo Finance.
 */
export async function fetchYahooQuotes(tickers: string[]): Promise<Map<string, PriceQuote>> {
    const results = new Map<string, PriceQuote>();

    try {
        const yahooFinance = await getYahooClient();

        // Yahoo Finance supports batch quotes
        const quotes = await yahooFinance.quote(tickers) as YahooQuote[];

        // Handle both single and array responses
        const quotesArray = Array.isArray(quotes) ? quotes : [quotes];

        for (const quote of quotesArray) {
            if (quote && quote.regularMarketPrice) {
                results.set(quote.symbol, {
                    ticker: quote.symbol,
                    price: quote.regularMarketPrice,
                    currency: quote.currency || 'USD',
                    change: quote.regularMarketChange || 0,
                    changePercent: quote.regularMarketChangePercent || 0,
                    timestamp: quote.regularMarketTime || new Date(),
                    delayed: true,
                    source: 'yahoo',
                });
            }
        }
    } catch (error) {
        console.error('Error fetching Yahoo batch quotes:', error);

        // Fallback to individual fetches
        for (const ticker of tickers) {
            const quote = await fetchYahooQuote(ticker);
            if (quote) {
                results.set(ticker, quote);
            }
        }
    }

    return results;
}

/**
 * Convert Nordnet/ISIN identifier to Yahoo ticker.
 * Danish stocks need .CO suffix.
 */
export function toYahooTicker(identifier: string, exchange?: string): string {
    // Already has exchange suffix
    if (identifier.includes('.')) {
        return identifier;
    }

    // Danish exchange
    if (exchange === 'CPH' || exchange === 'XCSE' || exchange === 'Copenhagen') {
        return `${identifier}.CO`;
    }

    // Swedish exchange
    if (exchange === 'STO' || exchange === 'XSTO' || exchange === 'Stockholm') {
        return `${identifier}.ST`;
    }

    // German exchange
    if (exchange === 'FRA' || exchange === 'XFRA' || exchange === 'Frankfurt') {
        return `${identifier}.F`;
    }

    // Default: assume US (no suffix needed)
    return identifier;
}

/**
 * Validate if a ticker is supported by Yahoo Finance.
 */
export async function validateYahooTicker(ticker: string): Promise<boolean> {
    try {
        const yahooFinance = await getYahooClient();
        const result = await yahooFinance.search(ticker) as any;
        return Array.isArray(result.quotes) && result.quotes.length > 0;
    } catch {
        return false;
    }
}
