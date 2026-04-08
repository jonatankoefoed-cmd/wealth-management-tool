/**
 * Shared Formatting Utilities
 * 
 * Ensures consistent 'da-DK' formatting across the application.
 */

export const formatCurrency = (value: number, currency: string = "DKK"): string => {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('da-DK', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatAmount = (value: number): string => {
  return new Intl.NumberFormat('da-DK', {
    maximumFractionDigits: 0,
  }).format(value);
};

// Aliases for backward compatibility
export const formatDKK = formatCurrency;
export const formatNumber = formatAmount;
