/**
 * Price Cache Service
 * 
 * Reads and writes price quotes from/to the database Price table.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PriceQuoteResult } from './types';

let prismaClient: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
    if (!prismaClient) {
        prismaClient = new PrismaClient();
    }
    return prismaClient;
}

/**
 * Get cached price quote for an instrument on a specific date.
 */
export async function getCachedQuote(
    instrumentId: string,
    date: Date
): Promise<PriceQuoteResult | null> {
    const prisma = getPrismaClient();
    // Normalize date to start of day
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);

    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);

    const price = await prisma.price.findFirst({
        where: {
            instrumentId,
            date: {
                gte: dateStart,
                lt: dateEnd,
            },
        },
        orderBy: { date: 'desc' },
    });

    if (!price) {
        return null;
    }

    return {
        status: 'OK',
        price: Number(price.close),
        asOf: price.date.toISOString().split('T')[0],
        source: 'cache',
        notes: price.source ?? undefined,
    };
}

/**
 * Get the most recent price for an instrument before or on a date.
 */
export async function getLastKnownPrice(
    instrumentId: string,
    beforeDate: Date
): Promise<PriceQuoteResult | null> {
    const prisma = getPrismaClient();
    const price = await prisma.price.findFirst({
        where: {
            instrumentId,
            date: { lte: beforeDate },
        },
        orderBy: { date: 'desc' },
    });

    if (!price) {
        return null;
    }

    return {
        status: 'OK',
        price: Number(price.close),
        asOf: price.date.toISOString().split('T')[0],
        source: 'cache',
        notes: `Last known price from ${price.source ?? 'unknown'}`,
    };
}

/**
 * Save a price quote to the database.
 */
export async function saveQuote(args: {
    instrumentId: string;
    date: Date;
    price: number;
    currency: string;
    source: string;
}): Promise<void> {
    const prisma = getPrismaClient();
    // Normalize date to start of day
    const dateNormalized = new Date(args.date);
    dateNormalized.setHours(0, 0, 0, 0);

    await prisma.price.upsert({
        where: {
            id: `${args.instrumentId}_${dateNormalized.toISOString().split('T')[0]}`,
        },
        create: {
            id: `${args.instrumentId}_${dateNormalized.toISOString().split('T')[0]}`,
            instrumentId: args.instrumentId,
            date: dateNormalized,
            close: new Prisma.Decimal(args.price),
            currency: args.currency,
            source: args.source,
        },
        update: {
            close: new Prisma.Decimal(args.price),
            currency: args.currency,
            source: args.source,
        },
    });
}

/**
 * Check if a price exists for instrument on date.
 */
export async function hasPrice(
    instrumentId: string,
    date: Date
): Promise<boolean> {
    const quote = await getCachedQuote(instrumentId, date);
    return quote !== null;
}
