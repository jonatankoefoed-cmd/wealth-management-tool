/**
 * Projection Math Utilities
 * 
 * Math functions for projection calculations including amortization.
 */

import { MonthKey } from './types';
import { addMonths } from './months';

/**
 * Round to 2 decimal places.
 */
export function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Clamp value between 0 and 1.
 */
export function clamp01(n: number): number {
    return Math.max(0, Math.min(1, n));
}

/**
 * Clamp to minimum 0.
 */
export function clampMin0(n: number): number {
    return Math.max(0, n);
}

// ============================================================
// AMORTIZATION SCHEDULE
// ============================================================

export interface AmortizationRow {
    month: MonthKey;
    openingBalance: number;
    payment: number;
    interest: number;
    principal: number;
    closingBalance: number;
}

/**
 * Build a full amortization schedule for a loan.
 */
export function buildAmortizationSchedule(params: {
    startMonth: MonthKey;
    months: number;
    principal: number;
    nominalAnnualRate: number;
    termMonths: number;
}): AmortizationRow[] {
    const { startMonth, months, principal, nominalAnnualRate, termMonths } = params;

    if (principal <= 0) {
        return [];
    }

    const r = nominalAnnualRate / 12;

    // Calculate fixed payment using annuity formula
    let payment: number;
    if (r === 0) {
        payment = round2(principal / termMonths);
    } else {
        payment = round2(principal * r / (1 - Math.pow(1 + r, -termMonths)));
    }

    const schedule: AmortizationRow[] = [];
    let balance = principal;

    for (let i = 0; i < months && balance > 0.01; i++) {
        const month = addMonths(startMonth, i);
        const openingBalance = round2(balance);

        // Interest for this period
        const interest = round2(openingBalance * r);

        // Principal is payment minus interest
        let principalPart = round2(payment - interest);

        // On last payment or when balance is less than payment, adjust
        if (principalPart > openingBalance) {
            principalPart = openingBalance;
        }

        const actualPayment = round2(interest + principalPart);
        const closingBalance = round2(clampMin0(openingBalance - principalPart));

        schedule.push({
            month,
            openingBalance,
            payment: actualPayment,
            interest,
            principal: principalPart,
            closingBalance,
        });

        balance = closingBalance;
    }

    return schedule;
}

/**
 * Get amortization row for a specific month (or null if not found).
 */
export function getAmortizationForMonth(
    schedule: AmortizationRow[],
    month: MonthKey
): AmortizationRow | null {
    return schedule.find(r => r.month === month) ?? null;
}

/**
 * Sum all interest payments in schedule.
 */
export function totalInterestInSchedule(schedule: AmortizationRow[]): number {
    return round2(schedule.reduce((sum, r) => sum + r.interest, 0));
}

/**
 * Sum all principal payments in schedule.
 */
export function totalPrincipalInSchedule(schedule: AmortizationRow[]): number {
    return round2(schedule.reduce((sum, r) => sum + r.principal, 0));
}
