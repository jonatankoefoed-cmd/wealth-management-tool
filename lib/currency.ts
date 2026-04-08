
export const CURRENCY_RATES: Record<string, number> = {
    'DKK': 1,
    'EUR': 7.46,
    'USD': 6.85, // Approx recent rate
    'SEK': 0.65,
    'NOK': 0.63,
    'GBP': 8.70,
    'CAD': 5.10,
};

export function convertToDKK(amount: number, currency: string): number {
    const rate = CURRENCY_RATES[currency?.toUpperCase()] || 1; // Default to 1 if unknown, or maybe 0? 1 is safer to avoid zeroing out DKK

    // If currency is unknown and not DKK, 1:1 is likely wrong but better than 0 for visibility.
    // Ideally we warn.
    return amount * rate;
}

export function formatCurrency(amount: number, currency = 'DKK'): string {
    return new Intl.NumberFormat('da-DK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
    }).format(amount);
}
