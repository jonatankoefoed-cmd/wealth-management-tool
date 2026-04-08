/**
 * Pricing Service
 * 
 * Main entry point for fetching price quotes.
 * Checks cache first, then calls provider if needed.
 */

import { prisma } from '../lib/db';
import { PriceQuoteResult, PriceQuoteWithInstrument, PriceProvider } from './types';
import { getCachedQuote, getLastKnownPrice, saveQuote } from './cache';
import { stubProvider } from './providers/stubProvider';

function getPrismaClient() {
    return prisma;
}

// Default provider - can be swapped for real provider later
let activeProvider: PriceProvider = stubProvider;

/**
 * Set the active price provider.
 */
export function setProvider(provider: PriceProvider): void {
    activeProvider = provider;
}

/**
 * Get the currently active provider name.
 */
export function getProviderName(): string {
    return activeProvider.name;
}

/**
 * Get a price quote for an instrument.
 * 
 * Flow:
 * 1. Check cache (Price table)
 * 2. If missing, call provider
 * 3. If provider returns OK, save to cache
 * 4. Return result
 */
export async function getPriceQuote(args: {
    instrumentId: string;
    date: Date;
    currency?: string;
}): Promise<PriceQuoteWithInstrument> {
    const prisma = getPrismaClient();
    const { instrumentId, date, currency = 'DKK' } = args;

    // 1. Check cache for exact date
    const cachedQuote = await getCachedQuote(instrumentId, date);
    if (cachedQuote && cachedQuote.status === 'OK') {
        return { ...cachedQuote, instrumentId };
    }

    // 2. Try to get last known price (for shadow execution, close enough is OK)
    const lastKnown = await getLastKnownPrice(instrumentId, date);
    if (lastKnown && lastKnown.status === 'OK') {
        return {
            ...lastKnown,
            instrumentId,
            notes: `Using last known price from ${lastKnown.asOf}`,
        };
    }

    // 3. Fetch instrument details for provider
    const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId },
    });

    if (!instrument) {
        return {
            status: 'ERROR',
            price: null,
            asOf: date.toISOString().split('T')[0],
            source: 'error',
            instrumentId,
            notes: `Instrument ${instrumentId} not found`,
        };
    }

    // 4. Call provider
    const providerResult = await activeProvider.getQuote({
        instrument: {
            id: instrument.id,
            isin: instrument.isin ?? undefined,
            ticker: instrument.ticker ?? undefined,
            name: instrument.name,
        },
        date,
        currency,
    });

    // 5. Save to cache if OK
    if (providerResult.status === 'OK' && providerResult.price !== null) {
        await saveQuote({
            instrumentId,
            date,
            price: providerResult.price,
            currency,
            source: providerResult.source,
        });
    }

    return { ...providerResult, instrumentId };
}

/**
 * Get price quotes for multiple instruments.
 */
export async function getBatchPriceQuotes(args: {
    instrumentIds: string[];
    date: Date;
    currency?: string;
}): Promise<Map<string, PriceQuoteWithInstrument>> {
    const results = new Map<string, PriceQuoteWithInstrument>();

    // Fetch in parallel
    const promises = args.instrumentIds.map(async (id) => {
        const quote = await getPriceQuote({
            instrumentId: id,
            date: args.date,
            currency: args.currency,
        });
        return { id, quote };
    });

    const resolved = await Promise.all(promises);

    for (const { id, quote } of resolved) {
        results.set(id, quote);
    }

    return results;
}
