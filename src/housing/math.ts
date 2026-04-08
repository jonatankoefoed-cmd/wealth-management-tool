/**
 * Housing Math Utilities
 * 
 * Pure math functions for loan calculations.
 */

/**
 * Calculate monthly annuity payment.
 * 
 * Formula: Y = L × r / (1 - (1+r)^(-n))
 * where r = nominalAnnualRate/12, n = termYears × 12
 * 
 * @param principal - Loan amount in DKK
 * @param nominalAnnualRate - Annual interest rate (e.g. 0.04 for 4%)
 * @param termYears - Loan term in years
 * @returns Monthly payment in DKK
 */
export function annuityPaymentMonthly(
    principal: number,
    nominalAnnualRate: number,
    termYears: number
): number {
    if (principal < 0) {
        throw new Error('Principal must be >= 0');
    }
    if (termYears <= 0) {
        throw new Error('Term must be > 0 years');
    }
    if (principal === 0) {
        return 0;
    }

    const n = termYears * 12;

    // Edge case: 0% interest
    if (nominalAnnualRate === 0) {
        return round2(principal / n);
    }

    const r = nominalAnnualRate / 12;
    const payment = principal * r / (1 - Math.pow(1 + r, -n));

    return round2(payment);
}

/**
 * Round to 2 decimal places (currency standard).
 */
export function round2(amount: number): number {
    return Math.round(amount * 100) / 100;
}

/**
 * Round to nearest 100 (for registration fees).
 */
export function roundNearest100(amount: number): number {
    return Math.round(amount / 100) * 100;
}

/**
 * Apply rounding rule.
 */
export function applyRounding(amount: number, rule: 'NEAREST_100' | 'NONE'): number {
    if (rule === 'NEAREST_100') {
        return roundNearest100(amount);
    }
    return round2(amount);
}

/**
 * Clamp day to end of month if needed.
 */
export function clampDayToMonthEnd(day: number, date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Math.min(day, lastDay);
}

/**
 * Calculate total interest paid over loan term.
 */
export function totalInterestPaid(
    principal: number,
    nominalAnnualRate: number,
    termYears: number
): number {
    const monthlyPayment = annuityPaymentMonthly(principal, nominalAnnualRate, termYears);
    const totalPayments = monthlyPayment * termYears * 12;
    return round2(totalPayments - principal);
}
