/**
 * Run Monthly Savings Script
 * 
 * Cron-ready script that executes pending monthly savings plans.
 * Run with: npm run monthly:run
 */

import { PrismaClient } from '@prisma/client';
import { executeShadowMonthlySavings, getPendingExecutions } from '../src/monthlySavings';

const prisma = new PrismaClient();

async function main() {
    console.log('='.repeat(60));
    console.log('Monthly Savings Execution Runner');
    console.log('='.repeat(60));
    console.log(`Execution time: ${new Date().toISOString()}`);
    console.log('');

    // Get pending executions
    const pending = await getPendingExecutions(new Date());

    if (pending.length === 0) {
        console.log('No pending executions found.');
        console.log('All plans are either:');
        console.log('  - Already executed for this month');
        console.log('  - Not yet past their execution date');
        console.log('  - Paused');
        return;
    }

    console.log(`Found ${pending.length} pending execution(s):`);
    console.log('');

    const results: Array<{
        planId: string;
        planName: string | null;
        status: string;
        executedLines: number;
        failedLines: number;
        runId?: string;
        error?: string;
    }> = [];

    // Execute each pending plan
    for (const item of pending) {
        console.log(`Processing: ${item.planName || item.planId}`);
        console.log(`  Target Month: ${item.targetMonth}`);
        console.log(`  Execution Date: ${item.executionDate.toISOString().split('T')[0]}`);

        try {
            const result = await executeShadowMonthlySavings({
                planId: item.planId,
                targetMonth: item.targetMonth,
            });

            results.push({
                planId: item.planId,
                planName: item.planName,
                status: result.status,
                executedLines: result.executedLines,
                failedLines: result.failedLines,
                runId: result.runId,
            });

            console.log(`  ✓ Status: ${result.status}`);
            console.log(`    Executed: ${result.executedLines} lines`);
            console.log(`    Failed: ${result.failedLines} lines`);
            console.log(`    Run ID: ${result.runId}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            results.push({
                planId: item.planId,
                planName: item.planName,
                status: 'ERROR',
                executedLines: 0,
                failedLines: 0,
                error: errorMessage,
            });

            console.log(`  ✗ Error: ${errorMessage}`);
        }

        console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Total plans processed: ${results.length}`);
    console.log(`  SUCCESS: ${results.filter(r => r.status === 'SUCCESS').length}`);
    console.log(`  PARTIAL: ${results.filter(r => r.status === 'PARTIAL').length}`);
    console.log(`  FAILED: ${results.filter(r => r.status === 'FAILED').length}`);
    console.log(`  ERROR: ${results.filter(r => r.status === 'ERROR').length}`);

    // Exit with error code if any failures
    const hasFailures = results.some(r => r.status === 'ERROR' || r.status === 'FAILED');
    if (hasFailures) {
        process.exit(1);
    }
}

main()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
