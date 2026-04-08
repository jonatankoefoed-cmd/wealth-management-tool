import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CURRENCY_RATES: Record<string, number> = {
    'DKK': 1,
    'EUR': 7.46,
    'USD': 6.85,
    'SEK': 0.65,
    'NOK': 0.63,
    'GBP': 8.70,
    'CAD': 5.10,
};
function toDKK(amount: number, currency: string) {
    const rate = CURRENCY_RATES[currency?.toUpperCase()] || 1;
    return amount * rate;
}

async function main() {
    const userId = (await prisma.user.findFirst())?.id;
    if (!userId) throw new Error("No user found");

    const accounts = await prisma.account.findMany({
        where: { userId },
        include: {
            snapshots: {
                orderBy: { asOfDate: 'desc' },
                take: 1,
                include: {
                    lines: { include: { instrument: { include: { prices: { orderBy: { date: 'desc' }, take: 1 } } } } }
                }
            }
        }
    });

    console.log("Found Accounts:", accounts.length);

    let totalPortfolio = 0;

    for (const acc of accounts) {
        console.log(`\nAccount: ${acc.name} (${acc.id}) [${acc.type}]`);
        const snap = acc.snapshots[0];
        if (!snap) {
            console.log("  No snapshots.");
            continue;
        }

        console.log(`  Snapshot Date: ${snap.asOfDate.toISOString().split('T')[0]}`);

        let accValue = 0;
        for (const line of snap.lines) {
            const qty = Number(line.quantity);
            const priceRef = line.instrument.prices[0];
            const price = priceRef ? Number(priceRef.close) : Number(line.avgCost);
            const currency = line.instrument.currency || line.costCurrency || 'DKK';

            const valNative = qty * price;
            const valDKK = toDKK(valNative, currency);

            accValue += valDKK;

            console.log(`    - ${line.instrument.ticker || line.instrument.name}: ${qty} * ${price} ${currency} = ${valDKK.toFixed(0)} DKK`);
        }
        console.log(`  => Account Total: ${accValue.toFixed(0)} DKK`);
        totalPortfolio += accValue;
    }

    console.log(`\nGRAND TOTAL PORTFOLIO: ${totalPortfolio.toFixed(0)} DKK`);
}

main();
