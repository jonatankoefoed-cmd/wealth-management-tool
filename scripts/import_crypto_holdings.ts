import { PrismaClient, AccountType, AssetType, TaxBucket } from '@prisma/client';

const prisma = new PrismaClient();

const binanceHoldings = [
    { ticker: 'BETH', name: 'Beacon ETH', quantity: 0.59126412, valueUsdt: 1364.03 },
    { ticker: 'ADA', name: 'Cardano', quantity: 2600.34030729, valueUsdt: 643.32 },
    { ticker: 'SOL', name: 'Solana', quantity: 7.37888291, valueUsdt: 627.72 },
    { ticker: 'BTC', name: 'Bitcoin', quantity: 0.00385441, valueUsdt: 289.64 },
    { ticker: 'ALGO', name: 'Algorand', quantity: 1024.74941502, valueUsdt: 105.65 },
    { ticker: 'ETH', name: 'Ethereum', quantity: 0.03630099, valueUsdt: 83.75 },
    { ticker: 'AVAX', name: 'Avalanche', quantity: 8.26542859, valueUsdt: 76.29 },
    { ticker: 'DOT', name: 'Polkadot', quantity: 17.97944726, valueUsdt: 22.65 },
    { ticker: 'EUR', name: 'Euro (Binance)', quantity: 1.00865684, valueUsdt: 1.19 },
];

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');

    // 1. Ensure Binance Account exists
    let account = await prisma.account.findFirst({
        where: { userId: user.id, name: 'Binance' }
    });

    if (!account) {
        account = await prisma.account.create({
            data: {
                userId: user.id,
                name: 'Binance',
                type: AccountType.BROKERAGE,
                institution: 'Binance',
                currency: 'USD'
            }
        });
        console.log('Created Binance account');
    }

    const snapshotDate = new Date();
    snapshotDate.setUTCHours(12, 0, 0, 0);

    // 2. Clear existing snapshots for today/Binance
    const existingSnapshots = await prisma.holdingsSnapshot.findMany({
        where: { accountId: account.id, asOfDate: snapshotDate }
    });
    const snapshotIds = existingSnapshots.map(s => s.id);
    await prisma.holdingsSnapshotLine.deleteMany({ where: { snapshotId: { in: snapshotIds } } });
    await prisma.holdingsSnapshot.deleteMany({ where: { id: { in: snapshotIds } } });

    // 3. Create new snapshot
    const snapshot = await prisma.holdingsSnapshot.create({
        data: {
            userId: user.id,
            accountId: account.id,
            asOfDate: snapshotDate,
            currency: 'USD'
        }
    });

    for (const h of binanceHoldings) {
        // Find or create instrument
        let instrument = await prisma.instrument.findFirst({
            where: { ticker: h.ticker }
        });

        if (!instrument) {
            instrument = await prisma.instrument.create({
                data: {
                    ticker: h.ticker,
                    name: h.name,
                    assetType: AssetType.OTHER,
                    currency: 'USD',
                    taxBucket: TaxBucket.CAPITAL_INCOME
                }
            });
        }

        const price = h.valueUsdt / h.quantity;

        // Create snapshot line
        await prisma.holdingsSnapshotLine.create({
            data: {
                snapshotId: snapshot.id,
                instrumentId: instrument.id,
                quantity: h.quantity,
                avgCost: price, // Using current price as cost if unknown
                costCurrency: 'USD'
            }
        });

        // Add price record
        await prisma.price.create({
            data: {
                instrumentId: instrument.id,
                date: snapshotDate,
                close: price,
                currency: 'USD',
                source: 'Binance Import'
            }
        });
    }

    console.log(`Successfully imported ${binanceHoldings.length} crypto positions to Binance account.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
