import { PrismaClient, AccountType, AssetType, TaxBucket } from '@prisma/client';

const prisma = new PrismaClient();

const rawData = `Alibaba Group ADR,USD,16,"95,09","-0,94","139,69","7.101,34","2.235,04","14.202,67","38,20","3.925,68"
Alphabet A,USD,5,"149,70","-1,02","338,18","8.595,93","1.690,90","10.744,91","120,67","5.875,71"
Amundi Core MSCI World ETF Acc,EUR,10,"92,07","-0,58","145,66","8.708,17","1.456,55","10.885,21","58,40","4.013,22"
Amundi MSCI China ETF Acc,EUR,119,"15,37","-0,37","19,17","11.931,30","2.280,75","17.044,72","24,97","3.405,76"
Amundi MSCI New Energy ETF Dist,EUR,10,"41,54","-0,46","41,95","2.508,33","419,55","3.135,42","1,21","37,52"
Amundi Nasdaq-100 II UCITS ETF Acc,EUR,108,"49,11","-0,37","91,64","62.869,38","9.897,12","73.963,98","86,84","34.376,34"
Apple,USD,6,"160,36","-0,01","270,20","8.241,60","1.621,20","10.302,00","58,52","3.803,12"
CleanSpark,USD,29,"4,83","-4,01","11,49","0,00","333,21","2.117,40","112,55","1.121,20"
"Coinbase Global, Inc. - Class A",USD,9,"164,16","-3,01","200,11","2.288,90","1.800,99","11.444,48","12,98","1.314,62"
Danske Bank,DKK,75,"87,39","-0,81","331,10","19.866,00","24.832,50","24.832,50","278,89","18.278,50"
Danske Invest Global Indeks KL,DKK,11,"166,95","-0,20","171,85","1.606,80","1.890,35","1.890,35","2,93","53,88"
Danske Invest USA Indeks KL DKK d,DKK,8,"89,42","-0,32","92,50","629,00","740,00","740,00","3,44","24,62"
Galaxy Digital,USD,38,"4,45","-3,79","24,86","1.800,90","944,68","6.003,02","369,95","4.725,63"
GomSpace Group,SEK,60,"13,58","-3,58","19,40","80,66","1.164,00","806,59","36,30","214,83"
Lucid Group,USD,2,"249,33","-0,55","7,26","27,68","14,52","92,27","-97,26","-3.275,96"
Microsoft,USD,6,"282,98","-1,09","418,18","12.755,26","2.509,08","15.944,07","39,03","4.475,70"
NVIDIA,USD,60,"22,60","-1,26","199,14","53.148,69","11.948,40","75.926,71","728,99","66.767,81"
Novo Nordisk B,DKK,30,"218,14","-2,42","254,10","5.336,10","7.623,00","7.623,00","16,48","1.078,75"
Sea ADR A,USD,3,"82,42","-0,37","90,99","520,38","272,97","1.734,60","0,78","13,49"
Sparinvest INDEX Europa Growth KL,DKK,33,"146,08","-1,61","158,45","4.444,52","5.228,85","5.228,85","8,47","408,30"
Sparinvest INDEX Glb Akt KL,DKK,106,"168,19","-0,82","193,15","16.379,12","20.473,90","20.473,90","14,84","2.645,51"
Sparinvest INDEX USA Growth KL,DKK,71,"174,71","-0,20","204,00","12.311,40","14.484,00","14.484,00","16,77","2.079,67"
Sparinvest INDEX USA Small Cap KL,DKK,47,"116,08","-0,91","136,35","5.126,76","6.408,45","6.408,45","17,47","952,86"
Tesla,USD,6,"184,43","-0,97","396,72","6.050,34","2.380,32","15.125,86","96,44","7.425,93"
cBrain,DKK,30,"86,37","-2,89","73,80","1.328,40","2.214,00","2.214,00","-14,55","-377,00"
iShares Automation & Robotics UCITS ETF USD (Acc),EUR,65,"10,84","-1,17","15,24","5.180,76","990,34","7.401,09","40,84","2.146,02"
iShares Core MSCI EM IMI UCITS ETF USD (Acc),EUR,23,"24,97","-1,66","43,62","5.623,88","1.003,38","7.498,51","74,80","3.208,67"
iShares Core MSCI Europe UCITS ETF EUR (Acc),EUR,2,"61,84","-0,98","98,92","1.182,81","197,84","1.478,51","60,26","555,96"
iShares Core MSCI World UCITS ETF USD (Acc),EUR,8,"90,41","-0,46","116,08","5.552,23","928,68","6.940,29","28,28","1.529,84"
iShares Core S&P 500 ETF USD Acc,EUR,23,"420,46","-0,32","647,34","89.014,69","14.888,82","111.268,37","54,07","39.050,40"
iShares Core S&P 500 ETF USD Dist,EUR,8,"39,01","-0,31","60,00","2.869,74","480,00","3.587,18","54,11","1.259,44"
iShares Global Clean Energy Transition UCITS ETF USD (Dist),EUR,479,"7,97","-0,21","9,45","27.062,55","4.526,55","33.828,19","18,53","5.289,03"
iShares MSCI China ETF USD Acc,EUR,69,"4,49","-0,62","5,13","1.850,28","353,69","2.643,26","14,50","334,81"`;

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user');

    const account = await prisma.account.findFirst({ where: { userId: user.id, name: 'Aktiedepot' } });
    if (!account) throw new Error('No account');

    const snapshotDate = new Date('2026-04-20T12:00:00Z');
    
    // Clear existing for this date
    await prisma.price.deleteMany({ where: { source: 'Nordnet CSV', date: snapshotDate } });
    
    const existingSnapshots = await prisma.holdingsSnapshot.findMany({
        where: { accountId: account.id, asOfDate: snapshotDate }
    });
    const snapshotIds = existingSnapshots.map(s => s.id);

    await prisma.holdingsSnapshotLine.deleteMany({
        where: { snapshotId: { in: snapshotIds } }
    });
    
    await prisma.holdingsSnapshot.deleteMany({
        where: { id: { in: snapshotIds } }
    });

    const snapshot = await prisma.holdingsSnapshot.create({
        data: { userId: user.id, accountId: account.id, asOfDate: snapshotDate, currency: 'DKK' }
    });

    const parseDanish = (s: string) => parseFloat(s.replace(/"/g, '').replace(/\./g, '').replace(',', '.'));

    const lines = rawData.split('\n');
    let totalDkkValue = 0;

    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Simple CSV parser for this specific format
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') inQuotes = !inQuotes;
            else if (line[i] === ',' && !inQuotes) {
                parts.push(current);
                current = '';
            } else current += line[i];
        }
        parts.push(current);

        const name = parts[0];
        const currency = parts[1];
        const quantity = parseDanish(parts[2]);
        const avgCost = parseDanish(parts[3]);
        const lastPrice = parseDanish(parts[5]);
        const valueDkk = parseDanish(parts[8]);

        totalDkkValue += valueDkk;

        let assetType = AssetType.STOCK;
        if (name.toLowerCase().includes('etf') || name.toLowerCase().includes('acc') || name.toLowerCase().includes('dist')) {
            assetType = AssetType.ETF;
        } else if (name.toLowerCase().includes('index') || name.toLowerCase().includes('indeks') || name.toLowerCase().includes(' kl')) {
            assetType = AssetType.FUND;
        }

        let instrument = await prisma.instrument.findFirst({ where: { name } });
        if (!instrument) {
            instrument = await prisma.instrument.create({
                data: { name, assetType, currency, taxBucket: assetType === AssetType.STOCK ? TaxBucket.EQUITY_INCOME : TaxBucket.UNKNOWN }
            });
        }

        await prisma.holdingsSnapshotLine.create({
            data: { snapshotId: snapshot.id, instrumentId: instrument.id, quantity, avgCost, costCurrency: currency }
        });

        await prisma.price.create({
            data: { instrumentId: instrument.id, date: snapshotDate, close: lastPrice, currency, source: 'Nordnet CSV' }
        });
    }

    console.log(`Successfully imported ${lines.length} positions.`);
    console.log(`Total Value: ${totalDkkValue.toLocaleString('da-DK', { style: 'currency', currency: 'DKK' })}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
