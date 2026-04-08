import { DebtAccount, DebtPosting } from "@prisma/client";

export interface DebtDetails {
    id: string;
    name: string;
    kind: string;
    balance: number;
    interestRate: number;
    paymentPeriodYears: number;
    repaymentStartDate: string | null;
}

export function calculateDebtBalance(postings: DebtPosting[]): number {
    return postings.reduce((sum, p) => {
        const amt = Number(p.amount);
        if (p.type === "DISBURSEMENT" || p.type === "INTEREST" || p.type === "ADJUSTMENT") {
            // Adjustments in this system seem to be positive additions to debt based on previous scripts
            // But let's verify: usually adjustment can be +/-. 
            // In balance-sheet-snapshot.ts, it was (+) for Adjustment.
            // Let's stick to that for consistency.
            return sum + amt;
        }
        if (p.type === "REPAYMENT") return sum - amt;
        return sum;
    }, 0);
}

export function enhanceDebtDetails(account: DebtAccount & { postings: DebtPosting[] }): DebtDetails {
    const balance = calculateDebtBalance(account.postings);

    let interestRate = Number(account.annualRate) || 0;
    let paymentPeriodYears = 0;
    let repaymentStartDate = null;

    // Hardcode terms for SU Loans if missing
    if (account.kind === "SU") {
        if (interestRate === 0) interestRate = 0.04; // 4% during study
        paymentPeriodYears = 10; // Standard 7-15 years, picking 10
        // Assume repayment starts 1 year from now (end of study approx?)
        // Let's default to Jan 1, 2027 for projection purposes
        repaymentStartDate = "2027-01-01";
    }

    return {
        id: account.id,
        name: account.name,
        kind: account.kind,
        balance,
        interestRate,
        paymentPeriodYears,
        repaymentStartDate
    };
}
