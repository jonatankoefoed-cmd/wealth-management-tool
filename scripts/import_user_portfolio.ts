import { PrismaClient, AccountType, AssetType, TaxBucket } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    // 1. Find User
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('No user found in database. Run seed first.');
        return;
    }
    const userId = user.id;
    console.log(`Importing for user: ${userId}`);

    // 2. Identify the CSV file
    // The user mentioned: excel_prompt_context/Aktietabel, Nordnet kontonummer 45125028, 20.4.2026.csv
    const csvPath = path.join(process.cwd(), 'excel_prompt_context', 'Aktietabel, Nordnet kontonummer 45125028, 20.4.2026.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`File not found: ${csvPath}`);
        return;
    }

    // 3. Read and Decode UTF-16LE
    const buffer = fs.readFileSync(csvPath);
    // Remove BOM if present (first 2 bytes)
    const start = (buffer[0] === 0xff && buffer[1] === 0xfe) ? 2 : 0;
    const csvContent = buffer.subarray(start).toString('utf16le');

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
        console.error('CSV file is empty or missing headers.');
        return;
    }

    const headers = lines[0].split('\t').map(h => h.trim().replace(/^\uFEFF/, ''));
    console.log(`Headers found: ${headers.join(', ')}`);

    // Mapping columns
    const colMap = {
        name: headers.indexOf('Navn'),
        currency: headers.indexOf('Valuta'),
        quantity: headers.indexOf('Antal'),
        avgCost: headers.indexOf('GAK'),
        lastPrice: headers.indexOf('Seneste kurs'),
        valueDkk: headers.indexOf('Værdi DKK')
    };

    if (colMap.name === -1 || colMap.quantity === -1) {
        console.error('Could not find required columns in CSV.');
        return;
    }

    // 4. Find or Create Account
    const accountName = 'Aktiedepot';
    let account = await prisma.account.findFirst({
        where: { userId, name: accountName }
    });

    if (!account) {
        account = await prisma.account.create({
            data: {
                userId,
                name: accountName,
                type: AccountType.BROKERAGE,
                currency: 'DKK',
                institution: 'Nordnet'
            }
        });
        console.log(`Created Account: ${accountName}`);
    }

    // 5. Create Snapshot for "today" (2026-04-20 as per user state)
    // Actually using new Date() is fine, but let's be explicit if we can.
    // The user's system time says 2026-04-20.
    const snapshotDate = new Date('2026-04-20T12:00:00Z');
    
    // Delete any existing snapshot for this date to avoid duplicates if re-run
    await prisma.holdingsSnapshot.deleteMany({
        where: {
            accountId: account.id,
            asOfDate: snapshotDate
        }
    });

    const snapshot = await prisma.holdingsSnapshot.create({
        data: {
            userId,
            accountId: account.id,
            asOfDate: snapshotDate,
            currency: 'DKK'
        }
    });

    console.log(`Created Snapshot for ${snapshotDate.toISOString()}`);

    // 6. Process Rows
    let totalDkkValue = 0;

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split('\t').map(s => s.trim());
        if (row.length < headers.length) continue;

        const name = row[colMap.name];
        const currency = row[colMap.currency];
        
        // Parse Danish numbers: "1.234,56" -> 1234.56
        const parseDanish = (s: string) => {
            if (!s) return 0;
            return parseFloat(s.replace(/\./g, '').replace(',', '.'));
        };

        const quantity = parseDanish(row[colMap.quantity]);
        const avgCost = parseDanish(row[colMap.avgCost]);
        const lastPrice = parseDanish(row[colMap.lastPrice]);
        const valueDkk = parseDanish(row[colMap.valueDkk]);

        totalDkkValue += valueDkk;

        // Determine AssetType
        let assetType: AssetType = AssetType.STOCK;
        if (name.toLowerCase().includes('etf') || name.toLowerCase().includes('acc') || name.toLowerCase().includes('dist')) {
            assetType = AssetType.ETF;
        } else if (name.toLowerCase().includes('indeks') || name.toLowerCase().includes(' kl')) {
            assetType = AssetType.FUND;
        }

        // Find or Create Instrument
        let instrument = await prisma.instrument.findFirst({
            where: { name }
        });

        if (!instrument) {
            instrument = await prisma.instrument.create({
                data: {
                    name,
                    assetType,
                    currency,
                    taxBucket: assetType === AssetType.STOCK ? TaxBucket.EQUITY_INCOME : TaxBucket.UNKNOWN
                }
            });
            console.log(`[NEW] ${name}`);
        }

        // Create Snapshot Line
        await prisma.holdingsSnapshotLine.create({
            data: {
                snapshotId: snapshot.id,
                instrumentId: instrument.id,
                quantity,
                avgCost,
                costCurrency: currency || 'DKK'
            }
        });

        // Add Price entry
        await prisma.price.create({
            data: {
                instrumentId: instrument.id,
                date: snapshotDate,
                close: lastPrice,
                currency: currency || 'DKK',
                source: 'Nordnet CSV'
            }
        });
    }

    console.log(`\nImport Success!`);
    console.log(`Total Portfolio Value: ${totalDkkValue.toLocaleString('da-DK', { style: 'currency', currency: 'DKK' })}`);
    console.log(`Snapshot ID: ${snapshot.id}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
