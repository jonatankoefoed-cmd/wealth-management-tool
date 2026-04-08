/**
 * Month Utilities
 * 
 * Functions for working with MonthKey (YYYY-MM format).
 */

import { MonthKey } from './types';

/**
 * Convert a Date to MonthKey format.
 */
export function toMonthKey(date: Date): MonthKey {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
}

/**
 * Add N months to a MonthKey.
 */
export function addMonths(month: MonthKey, n: number): MonthKey {
    const [year, m] = month.split('-').map(Number);
    const date = new Date(year, m - 1 + n, 1);
    return toMonthKey(date);
}

/**
 * Generate a list of MonthKeys for N months starting from startMonth.
 */
export function listMonths(startMonth: MonthKey, count: number): MonthKey[] {
    const months: MonthKey[] = [];
    for (let i = 0; i < count; i++) {
        months.push(addMonths(startMonth, i));
    }
    return months;
}

/**
 * Parse a MonthKey into year and month numbers.
 */
export function parseMonthKey(month: MonthKey): { year: number; month: number } {
    const [y, m] = month.split('-').map(Number);
    return { year: y, month: m };
}

/**
 * Compare two MonthKeys.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareMonths(a: MonthKey, b: MonthKey): number {
    return a.localeCompare(b);
}

/**
 * Check if monthA is before monthB.
 */
export function isBefore(a: MonthKey, b: MonthKey): boolean {
    return compareMonths(a, b) < 0;
}

/**
 * Check if monthA is on or after monthB.
 */
export function isOnOrAfter(a: MonthKey, b: MonthKey): boolean {
    return compareMonths(a, b) >= 0;
}

/**
 * Get month difference (positive if b is after a).
 */
export function monthDiff(a: MonthKey, b: MonthKey): number {
    const pa = parseMonthKey(a);
    const pb = parseMonthKey(b);
    return (pb.year - pa.year) * 12 + (pb.month - pa.month);
}
