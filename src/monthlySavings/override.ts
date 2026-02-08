/**
 * Manual Price Override Service
 * 
 * Allows setting manual prices on executed lines to reconcile
 * with actual broker fills.
 * 
 * "Actuals Win" rule: manual override becomes the final price
 * and updates the underlying transaction.
 */

import { PrismaClient, Prisma } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
    if (!prismaClient) {
        prismaClient = new PrismaClient();
    }
    return prismaClient;
}

export interface OverrideResult {
    lineId: string;
    transactionId: string | null;
    previousPrice: number | null;
    newPrice: number;
    status: string;
}

/**
 * Set a manual price override on an execution line.
 * 
 * 1. Updates the execution line with override fields
 * 2. Updates the linked transaction's price
 * 3. Sets line status to OVERRIDDEN
 */
export async function setManualExecutionPrice(args: {
    executionLineId: string;
    manualPrice: number;
    note?: string;
}): Promise<OverrideResult> {
    const prisma = getPrismaClient();
    const { executionLineId, manualPrice, note } = args;

    // Load execution line
    const line = await prisma.executionLine.findUnique({
        where: { id: executionLineId },
        include: { transaction: true },
    });

    if (!line) {
        throw new Error(`ExecutionLine ${executionLineId} not found`);
    }

    const previousPrice = line.quotePrice ? Number(line.quotePrice) : null;

    // Update execution line
    await prisma.executionLine.update({
        where: { id: executionLineId },
        data: {
            manualPriceOverride: new Decimal(manualPrice),
            manualNote: note,
            overriddenAt: new Date(),
            status: 'OVERRIDDEN',
        },
    });

    // Update linked transaction if it exists
    if (line.transactionId && line.transaction) {
        await prisma.transaction.update({
            where: { id: line.transactionId },
            data: {
                price: new Decimal(manualPrice),
                source: 'monthly_plan_shadow_override',
            },
        });
    }

    return {
        lineId: executionLineId,
        transactionId: line.transactionId,
        previousPrice,
        newPrice: manualPrice,
        status: 'OVERRIDDEN',
    };
}

/**
 * Get all override-able lines for a run.
 */
export async function getOverrideableLines(runId: string): Promise<Array<{
    lineId: string;
    instrumentName: string;
    quotePrice: number | null;
    quantity: number | null;
    status: string;
    manualPriceOverride: number | null;
}>> {
    const prisma = getPrismaClient();
    const lines = await prisma.executionLine.findMany({
        where: { runId },
        include: { instrument: true },
        orderBy: { weightPct: 'desc' },
    });

    return lines.map(line => ({
        lineId: line.id,
        instrumentName: line.instrument.name,
        quotePrice: line.quotePrice ? Number(line.quotePrice) : null,
        quantity: line.quantity ? Number(line.quantity) : null,
        status: line.status,
        manualPriceOverride: line.manualPriceOverride ? Number(line.manualPriceOverride) : null,
    }));
}

/**
 * Remove a manual override (revert to original price).
 */
export async function removeManualOverride(executionLineId: string): Promise<void> {
    const prisma = getPrismaClient();
    const line = await prisma.executionLine.findUnique({
        where: { id: executionLineId },
    });

    if (!line) {
        throw new Error(`ExecutionLine ${executionLineId} not found`);
    }

    if (!line.quotePrice) {
        throw new Error('Cannot remove override: no original quote price');
    }

    // Revert line
    await prisma.executionLine.update({
        where: { id: executionLineId },
        data: {
            manualPriceOverride: null,
            manualNote: null,
            overriddenAt: null,
            status: 'EXECUTED',
        },
    });

    // Revert transaction
    if (line.transactionId) {
        await prisma.transaction.update({
            where: { id: line.transactionId },
            data: {
                price: line.quotePrice,
                source: 'monthly_plan_shadow',
            },
        });
    }
}
