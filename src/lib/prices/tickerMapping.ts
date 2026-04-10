/**
 * Ticker Mapping Service
 * 
 * Maps between ISIN codes and API-specific tickers.
 * Handles Danish (.CO), Swedish (.ST), and US stocks.
 */

import type { TickerMapping } from './types';

// Import ticker map
import tickerMapData from '../../data/ticker-map.json';

interface TickerMapFile {
    meta: { description: string; lastUpdated: string };
    stocks: Record<string, TickerMapping>;
    etfs: Record<string, TickerMapping>;
    crypto: Record<string, TickerMapping>;
    funds: Record<string, TickerMapping>;
}

const tickerMap = tickerMapData as unknown as TickerMapFile;

/**
 * Get mapping for an ISIN or identifier.
 */
export function getMapping(identifier: string): TickerMapping | null {
    // Check all categories
    const normalized = identifier.toUpperCase();

    // Check stocks
    if (tickerMap.stocks[normalized]) {
        return { ...tickerMap.stocks[normalized], isin: normalized };
    }

    // Check ETFs
    if (tickerMap.etfs[normalized]) {
        return { ...tickerMap.etfs[normalized], isin: normalized };
    }

    // Check crypto
    if (tickerMap.crypto[normalized]) {
        return tickerMap.crypto[normalized];
    }

    // Check funds
    if (tickerMap.funds[normalized]) {
        return { ...tickerMap.funds[normalized], isin: normalized };
    }

    return null;
}

/**
 * Get Yahoo ticker for an identifier.
 */
export function getYahooTicker(identifier: string): string | null {
    const mapping = getMapping(identifier);
    return mapping?.yahoo ?? null;
}

/**
 * Get Binance ticker for crypto.
 */
export function getBinanceTicker(identifier: string): string | null {
    const mapping = getMapping(identifier);
    return mapping?.binance ?? null;
}

/**
 * Get all known stock ISINs.
 */
export function getAllStockISINs(): string[] {
    return Object.keys(tickerMap.stocks);
}

/**
 * Get all known ETF ISINs.
 */
export function getAllETFISINs(): string[] {
    return Object.keys(tickerMap.etfs);
}

/**
 * Get all known crypto symbols.
 */
export function getAllCryptoSymbols(): string[] {
    return Object.keys(tickerMap.crypto);
}

/**
 * Determine asset type from identifier.
 */
export function getAssetType(identifier: string): TickerMapping['type'] | null {
    const mapping = getMapping(identifier);
    return mapping?.type ?? null;
}

/**
 * Check if ETF is on SKAT's positive list.
 */
export function isOnSkatsPositivliste(isin: string): boolean {
    const mapping = tickerMap.etfs[isin.toUpperCase()];
    return mapping?.onSkatsPositivliste === true;
}

/**
 * Search for mapping by name (partial match).
 */
export function searchByName(query: string): TickerMapping[] {
    const results: TickerMapping[] = [];
    const queryLower = query.toLowerCase();

    const allMappings = [
        ...Object.entries(tickerMap.stocks),
        ...Object.entries(tickerMap.etfs),
        ...Object.entries(tickerMap.crypto),
        ...Object.entries(tickerMap.funds),
    ];

    for (const [id, mapping] of allMappings) {
        if (mapping.name.toLowerCase().includes(queryLower)) {
            results.push({ ...mapping, isin: id });
        }
    }

    return results;
}

/**
 * Add or update a mapping.
 * Note: This only updates the in-memory map; persistence requires file write.
 */
export function addMapping(
    identifier: string,
    mapping: TickerMapping
): void {
    const category = mapping.type === 'crypto' ? 'crypto' :
        mapping.type === 'etf' ? 'etfs' :
            mapping.type === 'fund' ? 'funds' : 'stocks';

    (tickerMap as any)[category][identifier.toUpperCase()] = mapping;
}

/**
 * Get statistics about the ticker map.
 */
export function getMapStats(): {
    stocks: number;
    etfs: number;
    crypto: number;
    funds: number;
    total: number;
} {
    return {
        stocks: Object.keys(tickerMap.stocks).length,
        etfs: Object.keys(tickerMap.etfs).length,
        crypto: Object.keys(tickerMap.crypto).length,
        funds: Object.keys(tickerMap.funds).length,
        total: Object.keys(tickerMap.stocks).length +
            Object.keys(tickerMap.etfs).length +
            Object.keys(tickerMap.crypto).length +
            Object.keys(tickerMap.funds).length,
    };
}
