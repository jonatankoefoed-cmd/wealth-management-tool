/**
 * Monthly Savings Schedule Utilities
 * 
 * Functions for calculating execution dates with weekend fallback.
 */

/**
 * Get the execution date for a given target month.
 * 
 * Rules:
 * - Default day is 8 (or custom dayOfMonth)
 * - If Saturday: move to Monday (+2 days)
 * - If Sunday: move to Monday (+1 day)
 * - Day is clamped to month end if necessary
 */
export function getExecutionDate(targetMonth: string, dayOfMonth: number = 8): Date {
    // Parse target month "YYYY-MM"
    const [year, month] = targetMonth.split('-').map(Number);

    // Get last day of month
    const lastDay = new Date(year, month, 0).getDate();

    // Clamp day to month end
    const effectiveDay = Math.min(dayOfMonth, lastDay);

    // Create date (month is 0-indexed in JS)
    let date = new Date(year, month - 1, effectiveDay);

    // Weekend fallback
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 6) {
        // Saturday -> Monday
        date.setDate(date.getDate() + 2);
    } else if (dayOfWeek === 0) {
        // Sunday -> Monday
        date.setDate(date.getDate() + 1);
    }

    // Set to start of day
    date.setHours(0, 0, 0, 0);

    return date;
}

/**
 * Get the target month string for a given date.
 */
export function getTargetMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Check if a date is past the execution date for a target month.
 */
export function isPastExecutionDate(
    currentDate: Date,
    targetMonth: string,
    dayOfMonth: number = 8
): boolean {
    const execDate = getExecutionDate(targetMonth, dayOfMonth);
    return currentDate >= execDate;
}

/**
 * Get the next N months as target month strings.
 */
export function getNextMonths(startDate: Date, count: number): string[] {
    const months: string[] = [];
    const date = new Date(startDate);

    for (let i = 0; i < count; i++) {
        months.push(getTargetMonth(date));
        date.setMonth(date.getMonth() + 1);
    }

    return months;
}

/**
 * Check if a date falls on a weekend.
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}
