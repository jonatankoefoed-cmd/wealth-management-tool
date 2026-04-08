/**
 * Price Module Index
 * 
 * Exports all price and data fetching functionality.
 */

// Types
export type {
    PriceQuote,
    CachedPrice,
    TickerMapping,
    MortgageRates,
    PriceServiceConfig
} from './types';
export { DEFAULT_CONFIG } from './types';

// Main price service
export {
    getPrice,
    getBatchPrices,
    getPricesWithMapping,
    clearCache,
    clearCacheFor,
    getCacheStats,
    updateConfig
} from './priceService';

// Individual clients
export {
    fetchYahooQuote,
    fetchYahooQuotes,
    toYahooTicker,
    validateYahooTicker
} from './yahooFinanceClient';

export {
    fetchBinanceQuote,
    fetchBinanceQuotes,
    toBinanceSymbol,
    isBinanceSymbol
} from './binanceClient';

// Mortgage rates
export {
    getMortgageRates,
    getRateForMaturity,
    getAvailableMaturities,
    calculateMonthlyPayment,
    refreshMortgageRates
} from './mortgageRateService';

// Ticker mapping
export {
    getMapping,
    getYahooTicker,
    getBinanceTicker,
    getAllStockISINs,
    getAllETFISINs,
    getAllCryptoSymbols,
    getAssetType,
    isOnSkatsPositivliste,
    searchByName,
    getMapStats
} from './tickerMapping';
