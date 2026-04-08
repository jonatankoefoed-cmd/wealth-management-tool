
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = (await prisma.user.findFirst())?.id;
    if (!userId) throw new Error("No user found");

    const debts = await prisma.debtAccount.findMany({
        where: { userId },
        include: { postings: true }
    });

    console.log("Found Debt Accounts:", debts.length);

    for (const debt of debts) {
        console.log(`\nDebt: ${debt.name} (${debt.kind})`);
        console.log(`  ID: ${debt.id}`);
        console.log(`  Details:`, JSON.stringify(debt, null, 2));

        const balance = debt.postings.reduce((sum, p) => {
            const amt = Number(p.amount);
            if (p.type === "DISBURSEMENT" || p.type === "INTEREST") return sum + amt;
            if (p.type === "REPAYMENT") return sum - amt;
            if (p.type === "ADJUSTMENT") return sum + amt;
            return sum;
        }, 0);
        console.log(`  Calculated Balance: ${balance.toFixed(2)}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
