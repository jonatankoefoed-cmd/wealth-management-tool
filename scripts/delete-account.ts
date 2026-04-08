
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const accountId = "cmldxmwoq0006n264t6dpa68d"; // Nordnet Brokerage from debug-accounts.ts
    console.log(`Deleting account ${accountId}...`);

    // 1. Delete Snapshot Lines
    const snapshots = await prisma.holdingsSnapshot.findMany({ where: { accountId }, select: { id: true } });
    const snapshotIds = snapshots.map(s => s.id);
    if (snapshotIds.length > 0) {
        const lines = await prisma.holdingsSnapshotLine.deleteMany({ where: { snapshotId: { in: snapshotIds } } });
        console.log(`Deleted ${lines.count} snapshot lines.`);
    }

    // 2. Delete Snapshots
    const snaps = await prisma.holdingsSnapshot.deleteMany({ where: { accountId } });
    console.log(`Deleted ${snaps.count} snapshots.`);

    // 3. Delete Recurring Plans and Related Executions
    const plans = await prisma.recurringInvestmentPlan.findMany({ where: { accountId }, select: { id: true } });
    const planIds = plans.map(p => p.id);

    if (planIds.length > 0) {
        // Delete Plan Lines
        await prisma.recurringPlanLine.deleteMany({ where: { planId: { in: planIds } } });

        // Find Execution Runs
        const runs = await prisma.executionRun.findMany({ where: { planId: { in: planIds } }, select: { id: true } });
        const runIds = runs.map(r => r.id);

        if (runIds.length > 0) {
            // Delete Execution Lines
            await prisma.executionLine.deleteMany({ where: { runId: { in: runIds } } });
            // Delete Execution Runs
            await prisma.executionRun.deleteMany({ where: { planId: { in: planIds } } });
        }

        // Delete Plans
        const deletedPlans = await prisma.recurringInvestmentPlan.deleteMany({ where: { accountId } });
        console.log(`Deleted ${deletedPlans.count} plans.`);
    }

    // 4. Delete Transactions
    // (If transactions have execution lines not covered above, we might need more checks, but usually they are linked)
    // Check if any transactions are referenced by ExecutionLines that WEREN'T deleted?
    // ExecutionLine -> Transaction (transactionId) is unique.
    // If we delete Transaction, we might violate FK if ExecutionLine exists.
    // But we just deleted ExecutionLines for this account's plans.
    // What if there are manual transactions?

    // Let's safe delete execution lines linked to ANY transaction in this account first
    const txsForAcc = await prisma.transaction.findMany({ where: { accountId }, select: { id: true } });
    const txIds = txsForAcc.map(t => t.id);
    if (txIds.length > 0) {
        // Delete ExecutionLines that reference these transactions
        await prisma.executionLine.deleteMany({ where: { transactionId: { in: txIds } } });
    }

    const txs = await prisma.transaction.deleteMany({ where: { accountId } });
    console.log(`Deleted ${txs.count} transactions.`);

    // 5. Delete Account
    const acc = await prisma.account.delete({ where: { id: accountId } });
    console.log(`Deleted account: ${acc.name}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
