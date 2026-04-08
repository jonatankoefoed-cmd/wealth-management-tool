/**
 * Pricing Types
 * 
 * Types for the price quote system used by monthly savings execution.
 */

export type PriceQuoteStatus = 'OK' | 'MISSING' | 'ERROR';

export interface PriceQuoteResult {
    status: PriceQuoteStatus;
    price: number | null;
    asOf: string;         // ISO date string
    source: string;       // 'cache' | 'yahoo' | 'manual' | 'stub'
    notes?: string;
}

export interface PriceQuoteWithInstrument extends PriceQuoteResult {
    instrumentId: string;
}

export interface PriceProviderArgs {
    instrument: {
        id?: string;
        isin?: string;
        ticker?: string;
        name?: string;
    };
    date: Date;
    currency: string;
}

export interface PriceProvider {
    name: string;
    getQuote(args: PriceProviderArgs): Promise<PriceQuoteResult>;
}
