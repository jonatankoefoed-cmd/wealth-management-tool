/**
 * Price Service Types
 * 
 * Common types for the realtime data pipeline.
 */

export interface PriceQuote {
    ticker: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number;
    timestamp: Date;
    delayed: boolean;
    source: 'yahoo' | 'binance' | 'manual';
}

export interface CachedPrice extends PriceQuote {
    cachedAt: number;
}

export interface TickerMapping {
    isin?: string;
    yahoo?: string;
    binance?: string;
    name: string;
    type: 'stock' | 'etf' | 'crypto' | 'fund' | 'bond';
    exchange?: string;
    onSkatsPositivliste?: boolean;
}

export interface MortgageRates {
    date: string;
    shortDKK: number;      // F-lån, kort rente DKK
    longDKK: number;       // Fastforrentet, lang rente DKK
    shortEUR: number;      // Kort rente EUR
    maturities: {
        '6M'?: number;
        '1Y'?: number;
        '3Y'?: number;
        '5Y'?: number;
        '10Y'?: number;
        '15Y'?: number;
        '20Y'?: number;
        '30Y'?: number;
    };
    source: string;
}

export interface PriceServiceConfig {
    cacheTTL: {
        stocks: number;    // milliseconds
        crypto: number;    // milliseconds
        mortgage: number;  // milliseconds
    };
    maxBatchSize: number;
}

export const DEFAULT_CONFIG: PriceServiceConfig = {
    cacheTTL: {
        stocks: 5 * 60 * 1000,      // 5 minutes
        crypto: 10 * 1000,          // 10 seconds
        mortgage: 24 * 60 * 60 * 1000, // 24 hours
    },
    maxBatchSize: 50,
};
