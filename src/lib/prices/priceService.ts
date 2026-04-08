/**
 * Price Service
 * 
 * Main entry point for fetching real-time prices for all asset types.
 * Aggregates data from Yahoo Finance (stocks/ETFs), Binance (crypto),
 * and provides caching to minimize API calls.
 */

import type { PriceQuote, CachedPrice, TickerMapping, PriceServiceConfig, DEFAULT_CONFIG } from './types';
import { fetchYahooQuote, fetchYahooQuotes } from './yahooFinanceClient';
import { fetchBinanceQuote, fetchBinanceQuotes, toBinanceSymbol } from './binanceClient';

// In-memory price cache
const priceCache = new Map<string, CachedPrice>();

// Default config
const config: PriceServiceConfig = {
    cacheTTL: {
        stocks: 5 * 60 * 1000,      // 5 minutes
        crypto: 10 * 1000,          // 10 seconds
        mortgage: 24 * 60 * 60 * 1000, // 24 hours
    },
    maxBatchSize: 50,
};

/**
 * Get price for a single ticker.
 */
export async function getPrice(
    ticker: string,
    type: 'stock' | 'crypto' = 'stock'
): Promise<PriceQuote | null> {
    const cacheKey = `${type}:${ticker}`;
    const ttl = type === 'crypto' ? config.cacheTTL.crypto : config.cacheTTL.stocks;

    // Check cache
    const cached = priceCache.get(cacheKey);
    if (cached && (Date.now() - cached.cachedAt) < ttl) {
        return cached;
    }

    // Fetch fresh data
    let quote: PriceQuote | null = null;

    if (type === 'crypto') {
        const binanceSymbol = toBinanceSymbol(ticker);
        quote = await fetchBinanceQuote(binanceSymbol);
    } else {
        quote = await fetchYahooQuote(ticker);
    }

    // Update cache
    if (quote) {
        priceCache.set(cacheKey, { ...quote, cachedAt: Date.now() });
    }

    return quote;
}

/**
 * Get prices for multiple tickers.
 * Efficiently batches requests and uses cache.
 */
export async function getBatchPrices(
    tickers: string[],
    type: 'stock' | 'crypto' = 'stock'
): Promise<Map<string, PriceQuote>> {
    const results = new Map<string, PriceQuote>();
    const ttl = type === 'crypto' ? config.cacheTTL.crypto : config.cacheTTL.stocks;
    const now = Date.now();

    // Separate cached and uncached tickers
    const uncached: string[] = [];

    for (const ticker of tickers) {
        const cacheKey = `${type}:${ticker}`;
        const cached = priceCache.get(cacheKey);

        if (cached && (now - cached.cachedAt) < ttl) {
            results.set(ticker, cached);
        } else {
            uncached.push(ticker);
        }
    }

    // Fetch uncached
    if (uncached.length > 0) {
        let freshQuotes: Map<string, PriceQuote>;

        if (type === 'crypto') {
            const binanceSymbols = uncached.map(t => toBinanceSymbol(t));
            freshQuotes = await fetchBinanceQuotes(binanceSymbols);
        } else {
            freshQuotes = await fetchYahooQuotes(uncached);
        }

        // Add to results and cache
        for (const [ticker, quote] of freshQuotes) {
            results.set(ticker, quote);
            priceCache.set(`${type}:${ticker}`, { ...quote, cachedAt: now });
        }
    }

    return results;
}

/**
 * Get prices for mixed asset types based on ticker mappings.
 */
export async function getPricesWithMapping(
    mappings: TickerMapping[]
): Promise<Map<string, PriceQuote>> {
    const results = new Map<string, PriceQuote>();

    // Separate by type
    const stockTickers: string[] = [];
    const cryptoTickers: string[] = [];

    for (const mapping of mappings) {
        if (mapping.type === 'crypto' && mapping.binance) {
            cryptoTickers.push(mapping.binance);
        } else if (mapping.yahoo) {
            stockTickers.push(mapping.yahoo);
        }
    }

    // Fetch in parallel
    const [stockPrices, cryptoPrices] = await Promise.all([
        stockTickers.length > 0 ? getBatchPrices(stockTickers, 'stock') : new Map(),
        cryptoTickers.length > 0 ? getBatchPrices(cryptoTickers, 'crypto') : new Map(),
    ]);

    // Merge results
    for (const [ticker, quote] of stockPrices) {
        results.set(ticker, quote);
    }
    for (const [ticker, quote] of cryptoPrices) {
        results.set(ticker, quote);
    }

    return results;
}

/**
 * Clear all cached prices.
 */
export function clearCache(): void {
    priceCache.clear();
}

/**
 * Clear cache for specific ticker.
 */
export function clearCacheFor(ticker: string, type: 'stock' | 'crypto' = 'stock'): void {
    priceCache.delete(`${type}:${ticker}`);
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { size: number; entries: string[] } {
    return {
        size: priceCache.size,
        entries: Array.from(priceCache.keys()),
    };
}

/**
 * Update service configuration.
 */
export function updateConfig(newConfig: Partial<PriceServiceConfig>): void {
    Object.assign(config, newConfig);
}
