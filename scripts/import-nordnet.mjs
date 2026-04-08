import { PrismaClient } from '@prisma/client';
import * as fs from 'node:fs';

const prisma = new PrismaClient();

async function main() {
    const userId = 'cmldxmwoo0000n264requt6t5';
    const accountId = 'cmldxmwoq0006n264t6dpa68d'; // Nordnet Brokerage

    // Read the CSV
    const csvContent = fs.readFileSync('Investeringer/nordnet_holdings_extracted.csv', 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');

    console.log('Headers:', headers);
    console.log(`Processing ${lines.length - 1} holdings...`);

    // Create a holdings snapshot - only schema-valid fields
    const snapshot = await prisma.holdingsSnapshot.create({
        data: {
            userId,
            accountId,
            asOfDate: new Date('2026-02-07'),
            currency: 'DKK',
        }
    });

    console.log(`Created snapshot: ${snapshot.id}`);

    // Process each line
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const isin = values[0];
        const ticker = values[1];
        const name = values[2];
        const quantity = parseFloat(values[3]);
        const avgCost = parseFloat(values[4]);
        const costCurrency = values[5];
        const assetType = values[6] || 'OTHER';
        const taxBucket = values[7]?.trim() || 'UNKNOWN';

        // Map asset types to schema enums
        let mappedAssetType = 'OTHER';
        if (assetType === 'EQUITY' || assetType === 'STOCK') mappedAssetType = 'STOCK';
        else if (assetType === 'ETF') mappedAssetType = 'ETF';
        else if (assetType === 'FUND') mappedAssetType = 'FUND';

        // Map tax buckets to schema enums
        let mappedTaxBucket = 'UNKNOWN';
        if (taxBucket === 'ASK') mappedTaxBucket = 'CAPITAL_INCOME';
        else if (taxBucket === 'DEPOT') mappedTaxBucket = 'EQUITY_INCOME';

        // Create or find instrument
        let instrument = await prisma.instrument.findFirst({
            where: { isin }
        });

        if (!instrument) {
            instrument = await prisma.instrument.create({
                data: {
                    isin,
                    ticker,
                    name,
                    currency: costCurrency,
                    assetType: mappedAssetType,
                    taxBucket: mappedTaxBucket,
                }
            });
            console.log(`Created instrument: ${ticker} (${isin})`);
        } else {
            console.log(`Found existing instrument: ${ticker} (${isin})`);
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

        console.log(`Added holding: ${ticker} x ${quantity} @ ${avgCost} ${costCurrency}`);
    }

    console.log('\nImport complete!');

    // Verify by querying
    const totalLines = await prisma.holdingsSnapshotLine.count({
        where: { snapshotId: snapshot.id }
    });
    console.log(`Total holdings in snapshot: ${totalLines}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
