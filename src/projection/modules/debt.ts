import { ProjectionModule, ModuleInput, ModuleOutput, MonthKey } from '../types';
import { round2 } from '../math';
import { makeProjectionAudit, dkkInput, stepCalc, stepOutput } from '../audit';

export interface DebtInput {
    id: string;
    name: string;
    principal: number;
    interestRateAnnual: number; // e.g., 0.04 for 4%
    interestRateFuture?: number; // Rate after switch date
    interestRateSwitchDate?: string; // YYYY-MM
    gracePeriodEnd?: string; // YYYY-MM
    minPayment?: number;
    accumulateInterest?: boolean; // If true, interest is added to principal during grace period
}

export interface DebtModuleConfig {
    debts: DebtInput[];
}

export class DebtModule implements ProjectionModule {
    readonly key = 'debt';
    private debts: DebtInput[];

    constructor(config: DebtModuleConfig) {
        this.debts = config.debts;
    }

    apply(input: ModuleInput): ModuleOutput {
        const perMonth: ModuleOutput['perMonth'] = {};
        const warnings: string[] = [];

        // Track current balance for each debt
        const balances = new Map<string, number>();
        this.debts.forEach(d => balances.set(d.id, d.principal));

        for (const month of input.months) {
            let totalInterest = 0;
            let totalPrincipalRepayment = 0;
            let totalBalance = 0;

            for (const debt of this.debts) {
                const currentBalance = balances.get(debt.id) || 0;

                if (currentBalance <= 0) continue;

                // Determine Interest Rate
                let rate = debt.interestRateAnnual;
                if (debt.interestRateSwitchDate && debt.interestRateFuture !== undefined) {
                    if (month >= debt.interestRateSwitchDate) {
                        rate = debt.interestRateFuture;
                    }
                }

                // Robust handling for percentage inputs (e.g. 5 vs 0.05)
                if (Math.abs(rate) > 1) {
                    rate = rate / 100;
                }

                // Monthly interest calculation
                const monthlyRate = rate / 12;
                const interest = round2(currentBalance * monthlyRate);

                // Determine if in grace period
                const isGracePeriod = debt.gracePeriodEnd ? month < debt.gracePeriodEnd : false;

                let payment = 0;
                let principalRepayment = 0;

                if (isGracePeriod) {
                    if (debt.accumulateInterest) {
                        payment = 0;
                        // Interest adds to balance
                    } else {
                        payment = interest; // Interest only payment
                    }
                } else {
                    // Standard annuity or min payment
                    // Improve fallback: 10 year annuity approx
                    // P * r * (1+r)^n / ((1+r)^n - 1)
                    // limit term to 120 months for calculation if unknown
                    const n = 120;
                    const annuity = (currentBalance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));

                    const calculatedPayment = Number.isFinite(annuity) ? annuity : (currentBalance / n);
                    payment = Math.max(calculatedPayment, debt.minPayment || 0);
                }

                // Apply payment
                if (debt.accumulateInterest && isGracePeriod) {
                    principalRepayment = -interest; // Negative repayment = growth
                    // New Balance = Old + Interest
                    // payment = 0
                } else {
                    principalRepayment = Math.max(0, payment - interest);
                    // Cap repayment to balance
                    if (principalRepayment > currentBalance) {
                        principalRepayment = currentBalance;
                        payment = principalRepayment + interest;
                    }
                }

                // Update balance
                const newBalance = round2(currentBalance - principalRepayment);
                balances.set(debt.id, newBalance);

                totalInterest += interest;
                totalPrincipalRepayment += Math.max(0, principalRepayment); // Don't track negative repayment as cashflow out
                totalBalance += newBalance;
            }

            perMonth[month] = {
                pnl: {
                    debtInterest: totalInterest,
                },
                cashFlow: {
                    principalRepayment: totalPrincipalRepayment,
                },
                balanceSheet: {
                    otherLiabilities: totalBalance,
                },
            };
        }

        return { perMonth, warnings };
    }
}

export function createDebtModule(config: DebtModuleConfig): DebtModule {
    return new DebtModule(config);
}
