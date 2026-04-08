import { PrismaClient, AccountType, AssetType, TaxBucket } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const userId = 'cmldxmwoo0000n264requt6t5'; // Hardcoded for now as per previous script
    const csvPath = path.join(process.cwd(), 'Files uploaded by me/Investeringer/nordnet_holdings_extracted.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`File not found: ${csvPath}`);
        return;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');

    console.log(`Processing ${lines.length - 1} holdings from ${csvPath}...`);

    // Group items by Account (based on taxBucket)
    const askItems: any[] = [];
    const depotItems: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 2) continue; // Skip empty lines

        const item = {
            isin: row[0],
            ticker: row[1],
            name: row[2],
            quantity: parseFloat(row[3]),
            avgCost: parseFloat(row[4]),
            costCurrency: row[5],
            assetType: row[6],
            taxBucket: row[7]?.trim()
        };

        if (item.taxBucket === 'ASK') {
            askItems.push(item);
        } else {
            depotItems.push(item);
        }
    }

    console.log(`Found ${askItems.length} ASK items and ${depotItems.length} Depot items.`);

    // Helper to process a batch
    const processBatch = async (items: any[], accountName: string, accountType: AccountType) => {
        if (items.length === 0) return;

        console.log(`\nImporting ${accountName}...`);

        // 1. Find or Create Account
        let account = await prisma.account.findFirst({
            where: { userId, name: accountName }
        });

        if (!account) {
            account = await prisma.account.create({
                data: {
                    userId,
                    name: accountName,
                    type: accountType,
                    currency: 'DKK',
                    institution: 'Nordnet'
                }
            });
            console.log(`Created Account: ${account.name} (${account.id})`);
        } else {
            console.log(`Found Account: ${account.name} (${account.id})`);
        }

        // 2. Create Snapshot
        const snapshot = await prisma.holdingsSnapshot.create({
            data: {
                userId,
                accountId: account.id,
                asOfDate: new Date(), // Today
                currency: 'DKK'
            }
        });
        console.log(`Created Snapshot: ${snapshot.id}`);

        // 3. Process Items
        for (const item of items) {
            // Map Enums
            let assetType: AssetType = AssetType.OTHER;
            if (item.assetType === 'EQUITY' || item.assetType === 'STOCK') assetType = AssetType.STOCK;
            else if (item.assetType === 'ETF') assetType = AssetType.ETF;
            else if (item.assetType === 'FUND') assetType = AssetType.FUND;

            let taxBucket: TaxBucket = TaxBucket.UNKNOWN;
            if (item.taxBucket === 'ASK') taxBucket = TaxBucket.CAPITAL_INCOME; // ASK is taxed as capital income (lagerbeskattet) - simplified
            else if (item.taxBucket === 'DEPOT') taxBucket = TaxBucket.EQUITY_INCOME;

            // Find or Upsert Instrument
            // Ensure ISIN is unique. If missing ISIN, use Ticker? Schema says ISIN unique.
            // CSV seems to have ISINs for all.

            let instrument = await prisma.instrument.findUnique({
                where: { isin: item.isin }
            });

            if (!instrument) {
                instrument = await prisma.instrument.create({
                    data: {
                        isin: item.isin,
                        ticker: item.ticker,
                        name: item.name,
                        currency: item.costCurrency,
                        assetType: assetType,
                        taxBucket: taxBucket
                    }
                });
                process.stdout.write('+');
            } else {
                // Update instrument info if needed? 
                process.stdout.write('.');
            }

            // check if price exists for today? maybe not needed for snapshot line specifically, 
            // but we need a price for valuation.
            // For now, just create the snapshot line.

            await prisma.holdingsSnapshotLine.create({
                data: {
                    snapshotId: snapshot.id,
                    instrumentId: instrument.id,
                    quantity: item.quantity,
                    avgCost: item.avgCost,
                    costCurrency: item.costCurrency
                }
            });
        }
        console.log(`\nImported ${items.length} lines for ${accountName}.`);
    };

    await processBatch(askItems, 'Nordnet ASK', AccountType.BROKERAGE);
    await processBatch(depotItems, 'Nordnet Depot', AccountType.BROKERAGE);

    console.log('\nImport completely finished.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
