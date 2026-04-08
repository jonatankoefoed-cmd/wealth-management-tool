import { PrismaClient } from '@prisma/client';
import * as fs from 'node:fs';

const prisma = new PrismaClient();

async function main() {
    const userId = 'cmldxmwoo0000n264requt6t5';
    const accountId = 'cmlfncrypto001'; // Binance Crypto

    // Read the CSV
    const csvContent = fs.readFileSync('Investeringer/binance_crypto_holdings.csv', 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');

    console.log('Headers:', headers);
    console.log(`Processing ${lines.length - 1} crypto holdings...`);

    // Create a holdings snapshot
    const snapshot = await prisma.holdingsSnapshot.create({
        data: {
            userId,
            accountId,
            asOfDate: new Date('2026-02-09'),
            currency: 'USD',
        }
    });

    console.log(`Created crypto snapshot: ${snapshot.id}`);

    // Process each line
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const ticker = values[0];
        const name = values[1];
        const quantity = parseFloat(values[2]);
        const avgCost = parseFloat(values[3]);
        const costCurrency = values[4];

        // Create or find instrument (crypto doesn't have ISIN)
        let instrument = await prisma.instrument.findFirst({
            where: { ticker, name }
        });

        if (!instrument) {
            instrument = await prisma.instrument.create({
                data: {
                    isin: null,
                    ticker,
                    name,
                    currency: costCurrency,
                    assetType: 'OTHER', // Crypto maps to OTHER
                    taxBucket: 'CAPITAL_INCOME',
                }
            });
            console.log(`Created crypto instrument: ${ticker} (${name})`);
        } else {
            console.log(`Found existing instrument: ${ticker} (${name})`);
        }

        // Create holdings snapshot line
        await prisma.holdingsSnapshotLine.create({
            data: {
                snapshotId: snapshot.id,
                instrumentId: instrument.id,
                quantity,
                avgCost,
                costCurrency,
            }
        });

        console.log(`Added crypto: ${ticker} x ${quantity} @ $${avgCost}`);
    }

    console.log('\nCrypto import complete!');

    // Verify by querying
    const totalLines = await prisma.holdingsSnapshotLine.count({
        where: { snapshotId: snapshot.id }
    });
    console.log(`Total crypto holdings in snapshot: ${totalLines}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
