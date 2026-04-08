import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const debtAccountId = 'cmldxmwpm0010n26439jmpcjf';

    // Delete old seed postings first
    const deleted = await prisma.debtPosting.deleteMany({
        where: { debtAccountId },
    });
    console.log(`Deleted ${deleted.count} old seed postings`);

    // Update debt account with correct rate (4% annual, from PDF)
    await prisma.debtAccount.update({
        where: { id: debtAccountId },
        data: {
            name: 'SU-lån 06',
            annualRate: 0.04,
        },
    });
    console.log('Updated DebtAccount: SU-lån 06, 4% annual rate');

    // All postings from 2025 kontoudtog
    const postings2025 = [
        { date: '2025-01-01', type: 'DISBURSEMENT', amount: 129070.27, note: 'Videreført fra 2024' },
        { date: '2025-01-15', type: 'INTEREST', amount: 422.54, note: 'Rentetilskrivning' },
        { date: '2025-02-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-02-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-02-15', type: 'INTEREST', amount: 447.65, note: 'Rentetilskrivning' },
        { date: '2025-03-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-03-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån (korrektion, trækkes jf. PDF)' },
        { date: '2025-03-15', type: 'INTEREST', amount: 449.12, note: 'Rentetilskrivning' },
        { date: '2025-04-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-04-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-04-15', type: 'INTEREST', amount: 474.33, note: 'Rentetilskrivning' },
        { date: '2025-05-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-05-15', type: 'INTEREST', amount: 487.74, note: 'Rentetilskrivning' },
        { date: '2025-06-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-06-15', type: 'INTEREST', amount: 501.21, note: 'Rentetilskrivning' },
        { date: '2025-07-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-07-15', type: 'INTEREST', amount: 514.72, note: 'Rentetilskrivning' },
        { date: '2025-08-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-08-15', type: 'INTEREST', amount: 528.27, note: 'Rentetilskrivning' },
        { date: '2025-09-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-09-15', type: 'INTEREST', amount: 541.87, note: 'Rentetilskrivning' },
        { date: '2025-10-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-10-15', type: 'INTEREST', amount: 555.51, note: 'Rentetilskrivning' },
        { date: '2025-11-01', type: 'DISBURSEMENT', amount: 17109, note: 'Udbetaling SU-lån (ekstra)' },
        { date: '2025-11-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-11-15', type: 'INTEREST', amount: 625.20, note: 'Rentetilskrivning' },
        { date: '2025-12-01', type: 'DISBURSEMENT', amount: 3625, note: 'Udbetaling SU-lån' },
        { date: '2025-12-15', type: 'INTEREST', amount: 639.12, note: 'Rentetilskrivning' },
    ];

    // 2026 kontoudtog
    const postings2026 = [
        { date: '2026-01-15', type: 'INTEREST', amount: 641.21, note: 'Rentetilskrivning' },
        { date: '2026-02-01', type: 'DISBURSEMENT', amount: 3799, note: 'Udbetaling SU-lån' },
        { date: '2026-02-01', type: 'DISBURSEMENT', amount: 3799, note: 'Udbetaling SU-lån' },
    ];

    const allPostings = [...postings2025, ...postings2026];

    let count = 0;
    for (const p of allPostings) {
        await prisma.debtPosting.create({
            data: {
                debtAccountId,
                date: new Date(p.date),
                type: p.type,
                amount: p.amount,
                currency: 'DKK',
                note: p.note,
            },
        });
        count++;
        console.log(`  ${p.date} | ${p.type.padEnd(12)} | ${String(p.amount).padStart(10)} | ${p.note}`);
    }

    console.log(`\nImported ${count} real SU debt postings`);

    // Verify final balance
    const result = await prisma.debtPosting.aggregate({
        where: { debtAccountId },
        _sum: { amount: true },
    });
    console.log(`Total balance in DB: ${result._sum.amount} DKK`);
    console.log('Expected from PDF: ~204,105.76 DKK (restgæld)');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
