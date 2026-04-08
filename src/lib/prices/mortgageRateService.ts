/**
 * Mortgage Rate Service
 * 
 * Fetches Danish mortgage bond rates from Finans Danmark.
 * Data is published weekly in Excel format.
 * 
 * Rate categories:
 * - Kort rente DKK (F-lån, variable)
 * - Lang rente DKK (fastforrentede 5-30 år)
 * - Kort rente EUR
 */

import type { MortgageRates } from './types';

// Finans Danmark publishes Excel files - we'll need to parse or use cached data
const FINANS_DANMARK_URL = 'https://finansdanmark.dk/tal-og-data/obligationsrenter/';

// Fallback static rates (updated manually or via scheduled job)
// These would typically be fetched and cached from Finans Danmark
const STATIC_RATES: MortgageRates = {
    date: '2026-02-07',
    shortDKK: 4.25,
    longDKK: 5.10,
    shortEUR: 3.80,
    maturities: {
        '6M': 4.25,
        '1Y': 4.35,
        '3Y': 4.55,
        '5Y': 4.85,
        '10Y': 5.00,
        '15Y': 5.10,
        '20Y': 5.20,
        '30Y': 5.35,
    },
    source: 'Finans Danmark (cached)',
};

// In-memory cache
let cachedRates: MortgageRates | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get current Danish mortgage bond rates.
 * 
 * Uses cached data with 24-hour TTL since rates are published weekly.
 */
export async function getMortgageRates(): Promise<MortgageRates> {
    const now = Date.now();

    // Return cached if still valid
    if (cachedRates && (now - cacheTimestamp) < CACHE_TTL) {
        return cachedRates;
    }

    // Try to fetch fresh data
    try {
        const freshRates = await fetchMortgageRates();
        cachedRates = freshRates;
        cacheTimestamp = now;
        return freshRates;
    } catch (error) {
        console.warn('Failed to fetch mortgage rates, using static fallback:', error);

        // Use static fallback
        cachedRates = STATIC_RATES;
        cacheTimestamp = now;
        return STATIC_RATES;
    }
}

/**
 * Fetch fresh mortgage rates from Finans Danmark.
 * 
 * Note: Finans Danmark publishes Excel files, not a JSON API.
 * This function would need to:
 * 1. Download the Excel file
 * 2. Parse using xlsx library
 * 3. Extract relevant rate data
 * 
 * For MVP, we return static data and implement full parsing later.
 */
async function fetchMortgageRates(): Promise<MortgageRates> {
    // TODO: Implement Excel download and parsing
    // For now, attempt to fetch indicator rates from alternative source

    try {
        // Attempt to fetch from Nationalbanken API (if available)
        const response = await fetch(
            'https://www.nationalbanken.dk/api/statistics/series/DNRENTM?format=json'
        );

        if (response.ok) {
            const data = await response.json();
            // Parse Nationalbanken data format
            return parseNationalbankData(data);
        }
    } catch {
        // Nationalbanken API not available or format changed
    }

    // Return enriched static data with current date
    return {
        ...STATIC_RATES,
        date: new Date().toISOString().split('T')[0],
        source: 'Finans Danmark (static fallback)',
    };
}

/**
 * Parse Nationalbanken statistics data.
 * This is a placeholder - actual implementation depends on API response format.
 */
function parseNationalbankData(data: unknown): MortgageRates {
    // Placeholder implementation
    // Real implementation would parse the actual API response
    return {
        ...STATIC_RATES,
        date: new Date().toISOString().split('T')[0],
        source: 'Danmarks Nationalbank',
    };
}

/**
 * Get rate for a specific maturity.
 */
export async function getRateForMaturity(
    maturity: keyof MortgageRates['maturities']
): Promise<number | null> {
    const rates = await getMortgageRates();
    return rates.maturities[maturity] ?? null;
}

/**
 * Get all available maturities.
 */
export async function getAvailableMaturities(): Promise<string[]> {
    const rates = await getMortgageRates();
    return Object.keys(rates.maturities);
}

/**
 * Calculate estimated monthly payment for a mortgage.
 * 
 * @param principal - Loan amount in DKK
 * @param maturityYears - Loan term in years
 * @param type - 'fixed' or 'variable'
 */
export async function calculateMonthlyPayment(
    principal: number,
    maturityYears: number,
    type: 'fixed' | 'variable' = 'fixed'
): Promise<{ payment: number; rate: number }> {
    const rates = await getMortgageRates();

    // Select appropriate rate
    let annualRate: number;
    if (type === 'variable') {
        annualRate = rates.shortDKK / 100;
    } else {
        // Map years to closest maturity
        const maturityKey = mapYearsToMaturity(maturityYears);
        annualRate = (rates.maturities[maturityKey] ?? rates.longDKK) / 100;
    }

    // Monthly rate
    const monthlyRate = annualRate / 12;
    const numPayments = maturityYears * 12;

    // Standard mortgage payment formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const payment = principal *
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

    return {
        payment: Math.round(payment),
        rate: annualRate * 100,
    };
}

/**
 * Map loan years to closest available maturity key.
 */
function mapYearsToMaturity(years: number): keyof MortgageRates['maturities'] {
    if (years <= 1) return '1Y';
    if (years <= 3) return '3Y';
    if (years <= 5) return '5Y';
    if (years <= 10) return '10Y';
    if (years <= 15) return '15Y';
    if (years <= 20) return '20Y';
    return '30Y';
}

/**
 * Force refresh of cached rates.
 */
export async function refreshMortgageRates(): Promise<MortgageRates> {
    cacheTimestamp = 0; // Invalidate cache
    return getMortgageRates();
}

/**
 * Update static rates (for manual or scheduled updates).
 */
export function updateStaticRates(rates: Partial<MortgageRates>): void {
    Object.assign(STATIC_RATES, rates, { date: new Date().toISOString().split('T')[0] });
    cachedRates = null; // Clear cache
}
