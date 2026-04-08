/**
 * Stub Price Provider
 * 
 * MVP provider that returns MISSING for all instruments.
 * Used as fallback when no real provider is available.
 * 
 * Can be extended to read from a manual configuration table.
 */

import { PriceProvider, PriceProviderArgs, PriceQuoteResult } from '../types';

export const stubProvider: PriceProvider = {
    name: 'stub',

    async getQuote(args: PriceProviderArgs): Promise<PriceQuoteResult> {
        // For MVP, always return MISSING
        // In production, this could check a manual price config table

        return {
            status: 'MISSING',
            price: null,
            asOf: args.date.toISOString().split('T')[0],
            source: 'stub',
            notes: `No price provider configured for ${args.instrument.ticker ?? args.instrument.isin ?? 'unknown instrument'}`,
        };
    },
};
