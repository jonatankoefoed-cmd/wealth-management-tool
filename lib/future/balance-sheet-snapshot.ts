import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { convertToDKK } from "@/lib/currency";

export interface BalanceSheetSnapshot {
    asOfDate: string;
    assets: {
        cashDKK: number;
        portfolioValueDKK: number | null;
        housingValueDKK: number | null;
    };
    liabilities: {
        suDebtDKK: number | null;
        housingLoanDKK: number | null;
        otherDebtDKK: number | null;
    };
    netWorthDKK: number | null;
    dataQuality: {
        missingPrices: boolean;
        missingFX: boolean;
        snapshotFound: boolean;
    };
}

export async function getTodayBalanceSheetSnapshot(userId: string): Promise<BalanceSheetSnapshot> {
    const prisma = getPrismaClient();

    // 1. Fetch Latest Holdings Snapshot
    const latestSnapshot = await prisma.holdingsSnapshot.findFirst({
        where: { userId },
        orderBy: { asOfDate: "desc" },
        include: {
            lines: {
                include: {
                    instrument: {
                        include: {
                            prices: {
                                orderBy: { date: "desc" },
                                take: 1,
                            },
                        },
                    },
                },
            },
            account: true,
        },
    });

    // 2. Fetch Latest Debts
    const debtAccounts = await prisma.debtAccount.findMany({
        where: { userId },
        include: {
            postings: true,
        },
    });

    // --- Calculate Assets ---
    let cashDKK = 0;
    let portfolioValueDKK = 0;
    let missingPrices = false;

    // Let's refetch: Get latest snapshot PER account.
    const uniqueAccounts = await prisma.account.findMany({
        where: { userId },
        select: { id: true, type: true }
    });

    if (latestSnapshot || uniqueAccounts.length > 0) {
        for (const account of uniqueAccounts) {
            const snap = await prisma.holdingsSnapshot.findFirst({
                where: { userId, accountId: account.id },
                orderBy: { asOfDate: "desc" },
                include: {
                    lines: { include: { instrument: { include: { prices: { orderBy: { date: 'desc' }, take: 1 } } } } }
                }
            });

            if (!snap) continue;

            // Process lines
            for (const line of snap.lines) {
                const qty = Number(line.quantity);

                // Check instrument type
                if (line.instrument.assetType === "OTHER" && line.instrument.name === "Cash") {
                    cashDKK += qty; // Assuming quantity = amount for cash placeholder
                    continue;
                }

                // For securities
                // We need a price.
                const latestPrice = line.instrument.prices[0];
                let price = 0;

                if (latestPrice) {
                    price = Number(latestPrice.close);
                } else {
                    // Fallback to cost basis if price is missing
                    price = Number(line.avgCost) || 0;
                    missingPrices = true;
                }

                // FX Conversion
                const currency = line.instrument.currency || line.costCurrency || 'DKK';
                const valueNative = price * qty;
                const valueDKK = convertToDKK(valueNative, currency);

                portfolioValueDKK += valueDKK;
            }
        }
    }

    // --- Calculate Liabilities ---
    let suDebtDKK = 0;
    let housingLoanDKK = 0;
    let otherDebtDKK = 0;

    for (const debt of debtAccounts) {
        const balance = debt.postings.reduce((sum, p) => {
            const amt = Number(p.amount);
            if (p.type === "DISBURSEMENT" || p.type === "INTEREST") return sum + amt;
            if (p.type === "REPAYMENT") return sum - amt;
            if (p.type === "ADJUSTMENT") return sum + amt;
            return sum;
        }, 0);

        const absBal = balance;

        if (debt.kind === "SU") suDebtDKK += absBal;
        else otherDebtDKK += absBal;

        if (debt.name.toLowerCase().includes("bolig") || debt.name.toLowerCase().includes("realkredit")) {
            housingLoanDKK += absBal;
        }
    }

    // --- Housing Asset ---
    let housingValueDKK = 0;

    const assets = {
        cashDKK,
        portfolioValueDKK: portfolioValueDKK,
        housingValueDKK: housingValueDKK || null,
    };

    const liabilities = {
        suDebtDKK,
        housingLoanDKK: housingLoanDKK || null,
        otherDebtDKK: otherDebtDKK || null,
    };

    const totalAssets = (assets.cashDKK || 0) + (assets.portfolioValueDKK || 0) + (assets.housingValueDKK || 0);
    const totalLiabilities = (liabilities.suDebtDKK || 0) + (liabilities.housingLoanDKK || 0) + (liabilities.otherDebtDKK || 0);

    return {
        asOfDate: new Date().toISOString().split("T")[0],
        assets,
        liabilities,
        netWorthDKK: (totalAssets - totalLiabilities),
        dataQuality: {
            missingPrices,
            missingFX: false,
            snapshotFound: !!latestSnapshot || (uniqueAccounts?.length ?? 0) > 0
        }
    };
}
