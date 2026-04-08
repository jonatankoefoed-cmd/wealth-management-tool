/**
 * Binance Client
 * 
 * Fetches real-time crypto prices from Binance public API.
 * No API key required for public market data.
 */

import type { PriceQuote } from './types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

interface BinanceTickerPrice {
    symbol: string;
    price: string;
}

interface BinanceTicker24h {
    symbol: string;
    lastPrice: string;
    priceChange: string;
    priceChangePercent: string;
}

/**
 * Fetch a single crypto quote from Binance.
 */
export async function fetchBinanceQuote(symbol: string): Promise<PriceQuote | null> {
    try {
        const response = await fetch(`${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`);

        if (!response.ok) {
            console.warn(`Binance API error for ${symbol}: ${response.status}`);
            return null;
        }

        const data: BinanceTicker24h = await response.json();

        // Determine quote currency from symbol (e.g., BTCUSDT -> USDT)
        const quoteCurrency = extractQuoteCurrency(symbol);

        return {
            ticker: symbol,
            price: parseFloat(data.lastPrice),
            currency: quoteCurrency,
            change: parseFloat(data.priceChange),
            changePercent: parseFloat(data.priceChangePercent),
            timestamp: new Date(),
            delayed: false, // Binance is real-time
            source: 'binance',
        };
    } catch (error) {
        console.error(`Error fetching Binance quote for ${symbol}:`, error);
        return null;
    }
}

/**
 * Fetch multiple crypto quotes from Binance.
 */
export async function fetchBinanceQuotes(symbols: string[]): Promise<Map<string, PriceQuote>> {
    const results = new Map<string, PriceQuote>();

    try {
        // Binance supports fetching all 24h tickers at once
        const response = await fetch(`${BINANCE_API_BASE}/ticker/24hr`);

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }

        const allTickers: BinanceTicker24h[] = await response.json();

        // Filter to requested symbols
        const symbolSet = new Set(symbols.map(s => s.toUpperCase()));

        for (const ticker of allTickers) {
            if (symbolSet.has(ticker.symbol)) {
                const quoteCurrency = extractQuoteCurrency(ticker.symbol);

                results.set(ticker.symbol, {
                    ticker: ticker.symbol,
                    price: parseFloat(ticker.lastPrice),
                    currency: quoteCurrency,
                    change: parseFloat(ticker.priceChange),
                    changePercent: parseFloat(ticker.priceChangePercent),
                    timestamp: new Date(),
                    delayed: false,
                    source: 'binance',
                });
            }
        }
    } catch (error) {
        console.error('Error fetching Binance batch quotes:', error);

        // Fallback to individual fetches
        for (const symbol of symbols) {
            const quote = await fetchBinanceQuote(symbol);
            if (quote) {
                results.set(symbol, quote);
            }
        }
    }

    return results;
}

/**
 * Extract quote currency from trading pair symbol.
 */
function extractQuoteCurrency(symbol: string): string {
    // Common quote currencies
    const quoteCurrencies = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'EUR', 'BNB'];

    for (const currency of quoteCurrencies) {
        if (symbol.endsWith(currency)) {
            return currency;
        }
    }

    // Default
    return 'USDT';
}

/**
 * Check if a symbol is traded on Binance.
 */
export async function isBinanceSymbol(symbol: string): Promise<boolean> {
    try {
        const response = await fetch(`${BINANCE_API_BASE}/ticker/price?symbol=${symbol}`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Convert common crypto identifiers to Binance symbol.
 */
export function toBinanceSymbol(identifier: string, quoteCurrency: string = 'USDT'): string {
    const base = identifier.toUpperCase().replace(/[-\/]/g, '');

    // Already has quote currency
    if (base.endsWith('USDT') || base.endsWith('BUSD') || base.endsWith('EUR')) {
        return base;
    }

    return `${base}${quoteCurrency}`;
}
