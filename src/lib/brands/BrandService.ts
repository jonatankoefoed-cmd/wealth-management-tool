// BrandService.ts

// Types needed for the service
export type SecurityType = 'stock' | 'etf' | 'fund' | 'crypto';

interface BrandRule {
    keywords: string[];
    domain: string;
}

// Client IDs provided by user
const BRANDFETCH_ID = '1idmK3o9tc0K-RvrDZU';
const LOGODEV_KEY = 'pk_aX_jJ9JBRImP4UGkAhnlEQ';

// 1. BRAND MAPPING (Legacy/Fallback)
const BRAND_RULES: BrandRule[] = [
    { keywords: ['ishares'], domain: 'ishares.com' },
    { keywords: ['sparindex'], domain: 'sparindex.dk' },
    { keywords: ['nordea', 'nordea invest'], domain: 'nordeainvest.dk' },
    { keywords: ['danske', 'danskeinvest.dk'], domain: 'danskeinvest.dk' },
    { keywords: ['vanguard'], domain: 'vanguard.com' },
    { keywords: ['xtrackers'], domain: 'etf.dws.com' },
    { keywords: ['spdr'], domain: 'ssga.com' },
    { keywords: ['lyxor'], domain: 'lyyorettf.com' },
    { keywords: ['amundi'], domain: 'amundietf.com' },
    { keywords: ['jpmorgan', 'jpm'], domain: 'jpmorgan.com' },
    { keywords: ['maj invest'], domain: 'majinvest.com' },
    { keywords: ['sydinvest'], domain: 'sydinvest.dk' },
    { keywords: ['nordnet'], domain: 'nordnet.dk' },
];

/**
 * BrandService: The central logic for fetching logos based on "Brand" identity.
 * Powered by Brandfetch (Primary) and Logo.dev (Backup).
 */
export const BrandService = {
    /**
     * Get the optimal logo URL for a security.
     * Strategy:
     * 1. Brandfetch ISIN (Best for EU Funds/Stocks)
     * 2. Brandfetch Ticker (Best for US Stocks)
     * 3. Brandfetch / CoinCap Crypto
     * 4. Google Favicon / FMP (Fallback)
     */
    getLogoUrl: (ticker: string, type: SecurityType, name: string, isin?: string | null): string => {
        // --- 1. ISIN LOOKUP (Brandfetch) ---
        // High priority for non-US stocks and funds where ticker might be ambiguous or local
        if (isin && isin.length > 0) {
            return `https://cdn.brandfetch.io/isin/${isin}?c=${BRANDFETCH_ID}`;
        }

        // --- 2. CRYPTO ---
        if (type === 'crypto') {
            // Brandfetch Ticker for Crypto (assuming standard symbols like BTC work)
            return `https://cdn.brandfetch.io/ticker/${ticker.toUpperCase()}?c=${BRANDFETCH_ID}`;
        }

        // --- 3. STOCKS / ETFs (Ticker) ---
        if (type === 'stock' || type === 'etf') {
            // Brandfetch Ticker
            return `https://cdn.brandfetch.io/ticker/${ticker.toUpperCase()}?c=${BRANDFETCH_ID}`;
        }

        // --- 4. FUNDS (Brand Inference Fallback - Brandfetch Domain) ---
        // If we have a domain, we can use Brandfetch Domain API
        const domain = findBrandDomain(name);
        if (domain) {
            return `https://cdn.brandfetch.io/${domain}?c=${BRANDFETCH_ID}`;
        }

        return '';
    },

    /**
     * Explicit fallback URL generator if the primary (Brandfetch) fails.
     * Can be used by the component's onError handler.
     */
    getFallbackUrl: (ticker: string, type: SecurityType, name: string): string => {
        // Crypto -> CoinCap
        if (type === 'crypto') {
            return `https://assets.coincap.io/assets/icons/${ticker.toLowerCase()}@2x.png`;
        }

        // Stock -> FMP
        if (type === 'stock') {
            return `https://financialmodelingprep.com/image-stock/${ticker.toUpperCase()}.png`;
        }

        // Fund -> Logo.dev (Provider - High Quality Backup)
        const domain = findBrandDomain(name);
        if (domain) {
            // Use Logo.dev as high-quality backup for brands
            return `https://img.logo.dev/${domain}?token=${LOGODEV_KEY}`;
        }
        return '';
    }
};

// --- HELPER: BRAND RESOLUTION ---
function findBrandDomain(name: string): string | null {
    const lowerName = name.toLowerCase();
    for (const rule of BRAND_RULES) {
        if (rule.keywords.some(k => lowerName.includes(k))) {
            return rule.domain;
        }
    }
    return null;
}
