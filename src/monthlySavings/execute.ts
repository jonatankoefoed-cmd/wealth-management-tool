/**
 * Shadow Monthly Savings Execution Service
 * 
 * Executes monthly investment plans by:
 * 1. Fetching price quotes
 * 2. Calculating quantities
 * 3. Creating BUY transactions
 * 4. Recording execution lines for audit
 */

import { RunStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/db';
import { getPriceQuote, PriceQuoteWithInstrument } from '../pricing';
import { getExecutionDate, getTargetMonth } from './schedule';

function getPrismaClient() {
    return prisma;
}

// Types
export interface ExecuteResult {
    runId: string;
    status: RunStatus;
    executedLines: number;
    failedLines: number;
    totalAmount: number;
    executionDate: string;
}

export interface AuditStep {
    label: string;
    formula: string;
    value: number;
    unit: string;
}

export interface ExecutionAudit {
    title: string;
    context: {
        planId: string;
        targetMonth: string;
        executionDate: string;
    };
    inputs: Array<{ label: string; value: number | string; unit: string; source: string }>;
    steps: AuditStep[];
    outputs: Array<{ label: string; value: number | string; unit: string }>;
    notes: string[];
}

/**
 * Execute a shadow monthly savings run.
 * 
 * Idempotent: if a run already exists for (planId, targetMonth), returns existing.
 */
export async function executeShadowMonthlySavings(args: {
    planId: string;
    targetMonth: string;
    force?: boolean;
}): Promise<ExecuteResult> {
    const prisma = getPrismaClient();
    const { planId, targetMonth, force = false } = args;

    // 1. Load plan with lines
    const plan = await prisma.recurringInvestmentPlan.findUnique({
        where: { id: planId },
        include: {
            lines: {
                include: { instrument: true },
                orderBy: { weightPct: 'desc' },
            },
        },
    });

    if (!plan) {
        throw new Error(`Plan ${planId} not found`);
    }

    // 2. Validate plan
    if (plan.status !== 'ACTIVE') {
        throw new Error(`Plan ${planId} is not ACTIVE (status: ${plan.status})`);
    }

    const totalAmount = Number(plan.amountDkk);
    if (totalAmount <= 0) {
        throw new Error(`Plan ${planId} has invalid amount: ${totalAmount}`);
    }

    // Validate weights sum to 100% (tolerance 0.01)
    const weightSum = plan.lines.reduce((sum, line) => sum + Number(line.weightPct), 0);
    if (Math.abs(weightSum - 100) > 0.01) {
        throw new Error(`Plan ${planId} weights sum to ${weightSum}%, expected 100%`);
    }

    // 3. Calculate execution date
    const executionDate = getExecutionDate(targetMonth, plan.dayOfMonth);

    // 4. Check for existing run (idempotency)
    const existingRun = await prisma.executionRun.findFirst({
        where: {
            planId,
            targetMonth,
        },
    });

    if (existingRun && !force) {
        const lineCount = await prisma.executionLine.count({
            where: { runId: existingRun.id },
        });

        return {
            runId: existingRun.id,
            status: existingRun.status,
            executedLines: lineCount,
            failedLines: 0,
            totalAmount,
            executionDate: executionDate.toISOString().split('T')[0],
        };
    }

    if (existingRun && force) {
        // Re-run for same month: remove previous generated artifacts and recreate.
        await prisma.$transaction(async (tx) => {
            await tx.executionLine.deleteMany({
                where: { runId: existingRun.id },
            });
            await tx.transaction.deleteMany({
                where: { executionRunId: existingRun.id },
            });
            await tx.executionRun.delete({
                where: { id: existingRun.id },
            });
        });
    }

    // 5. Create execution run
    const auditSteps: AuditStep[] = [];
    const auditNotes: string[] = [];

    const run = await prisma.executionRun.create({
        data: {
            planId,
            scheduledDate: executionDate,
            executedAt: new Date(),
            status: 'SUCCESS', // Will update if partial/failed
            targetMonth,
            totalAmount: new Prisma.Decimal(totalAmount),
        },
    });

    // 6. Allocate amounts to lines
    let executedCount = 0;
    let failedCount = 0;
    let remainder = 0;

    // Calculate line amounts
    const lineAllocations = plan.lines.map((line, index) => {
        let lineAmount = Math.round(totalAmount * (Number(line.weightPct) / 100) * 100) / 100;

        // Add remainder to first line (highest weight)
        if (index === plan.lines.length - 1) {
            const allocated = plan.lines.slice(0, -1).reduce((sum, l) => {
                return sum + Math.round(totalAmount * (Number(l.weightPct) / 100) * 100) / 100;
            }, 0);
            remainder = Math.round((totalAmount - allocated - lineAmount) * 100) / 100;
            lineAmount += remainder;
        }

        return {
            line,
            amount: lineAmount,
        };
    });

    if (remainder !== 0) {
        auditNotes.push(`Rounding remainder ${remainder} DKK added to ${plan.lines[plan.lines.length - 1].instrument.name}`);
    }

    // 7. Process each line
    for (const { line, amount } of lineAllocations) {
        const instrument = line.instrument;

        // Get price quote
        const quote = await getPriceQuote({
            instrumentId: instrument.id,
            date: executionDate,
        });

        auditSteps.push({
            label: `${instrument.name} allocation`,
            formula: `${totalAmount} × ${Number(line.weightPct)}%`,
            value: amount,
            unit: 'DKK',
        });

        if (quote.status !== 'OK' || quote.price === null) {
            // Failed line - no price
            await prisma.executionLine.create({
                data: {
                    runId: run.id,
                    instrumentId: instrument.id,
                    weightPct: line.weightPct,
                    targetAmount: new Prisma.Decimal(amount),
                    status: 'FAILED',
                    failureReason: quote.notes || 'Price quote not available',
                    quoteSource: quote.source,
                },
            });

            failedCount++;
            auditNotes.push(`FAILED: ${instrument.name} - ${quote.notes}`);
            continue;
        }

        // Calculate quantity
        const quantity = Math.round((amount / quote.price) * 1000000) / 1000000;

        auditSteps.push({
            label: `${instrument.name} quantity`,
            formula: `${amount} / ${quote.price}`,
            value: quantity,
            unit: 'shares',
        });

        // Create BUY transaction
        const tx = await prisma.transaction.create({
            data: {
                userId: plan.userId,
                accountId: plan.accountId,
                instrumentId: instrument.id,
                date: executionDate,
                type: 'BUY',
                quantity: new Prisma.Decimal(quantity),
                price: new Prisma.Decimal(quote.price),
                amount: new Prisma.Decimal(amount),
                fees: new Prisma.Decimal(0),
                currency: 'DKK',
                source: 'monthly_plan_shadow',
                executionRunId: run.id,
            },
        });

        // Create execution line
        await prisma.executionLine.create({
            data: {
                runId: run.id,
                instrumentId: instrument.id,
                weightPct: line.weightPct,
                targetAmount: new Prisma.Decimal(amount),
                quotePrice: new Prisma.Decimal(quote.price),
                quoteSource: quote.source,
                quantity: new Prisma.Decimal(quantity),
                status: 'EXECUTED',
                transactionId: tx.id,
            },
        });

        executedCount++;
    }

    // 8. Determine final status
    let finalStatus: RunStatus;
    if (failedCount === 0) {
        finalStatus = 'SUCCESS';
    } else if (executedCount === 0) {
        finalStatus = 'FAILED';
    } else {
        finalStatus = 'PARTIAL';
    }

    // 9. Build audit JSON
    const audit: ExecutionAudit = {
        title: `Monthly plan execution for ${targetMonth}`,
        context: {
            planId,
            targetMonth,
            executionDate: executionDate.toISOString().split('T')[0],
        },
        inputs: [
            { label: 'Total amount', value: totalAmount, unit: 'DKK', source: 'plan' },
            { label: 'Day of month', value: plan.dayOfMonth, unit: '', source: 'plan' },
            { label: 'Lines count', value: plan.lines.length, unit: '', source: 'plan' },
        ],
        steps: auditSteps,
        outputs: [
            { label: 'Executed lines', value: executedCount, unit: 'count' },
            { label: 'Failed lines', value: failedCount, unit: 'count' },
            { label: 'Status', value: finalStatus, unit: '' },
        ],
        notes: auditNotes,
    };

    // 10. Update run with final status and audit
    await prisma.executionRun.update({
        where: { id: run.id },
        data: {
            status: finalStatus,
            auditJson: audit as any,
        },
    });

    return {
        runId: run.id,
        status: finalStatus,
        executedLines: executedCount,
        failedLines: failedCount,
        totalAmount,
        executionDate: executionDate.toISOString().split('T')[0],
    };
}

/**
 * Get all pending executions for active plans.
 */
export async function getPendingExecutions(asOfDate: Date = new Date()): Promise<Array<{
    planId: string;
    planName: string | null;
    targetMonth: string;
    executionDate: Date;
}>> {
    const prisma = getPrismaClient();
    const currentMonth = getTargetMonth(asOfDate);

    // Get active plans
    const plans = await prisma.recurringInvestmentPlan.findMany({
        where: { status: 'ACTIVE' },
        include: {
            runs: {
                where: { targetMonth: currentMonth },
            },
        },
    });

    const pending: Array<{
        planId: string;
        planName: string | null;
        targetMonth: string;
        executionDate: Date;
    }> = [];

    for (const plan of plans) {
        // Check if already executed for current month
        if (plan.runs.length > 0) {
            continue;
        }

        const executionDate = getExecutionDate(currentMonth, plan.dayOfMonth);

        // Only include if past execution date
        if (asOfDate >= executionDate) {
            pending.push({
                planId: plan.id,
                planName: plan.name,
                targetMonth: currentMonth,
                executionDate,
            });
        }
    }

    return pending;
}
