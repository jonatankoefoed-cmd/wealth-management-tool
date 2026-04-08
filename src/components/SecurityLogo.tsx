import React from 'react';
import securityLogos from '../data/security-logos.json';
// Import the generated manifest. 
// Note: In Next.js/Webpack, importing a large JSON is fine for this size (50-200 entries).
import logoManifest from '../data/logo-manifest.json';
import { BrandService } from '../lib/brands/BrandService';

// Type for manifest entries
interface ManifestEntry {
    displayName: string;
    exists: boolean;
    path: string | null;
    source: string | null;
}

const MANIFEST = logoManifest as Record<string, ManifestEntry>;

interface SecurityLogoProps {
    /** Stock ticker (e.g., "AAPL") or full fund/ETF name */
    identifier: string;
    /** Type of security */
    type?: 'stock' | 'etf' | 'fund' | 'crypto';
    /** Full name of the security (for better fallback resolution) */
    name?: string;
    /** Size in pixels (24, 32, 48, 64) */
    size?: 24 | 32 | 48 | 64;

    /** Additional CSS classes */
    className?: string;
    /** Force generic icon (optional) */
    useGeneric?: boolean;
}

/**
 * SecurityLogo component displays the logo for a given security.
 * Strategy:
 * 1. Local Manifest (Simple Icons / Wikidata) - High Quality SVG, Zero Network.
 * 2. Brandfetch (Backup) - API High Quality.
 * 3. Fallbacks.
 */
export function SecurityLogo({
    identifier,
    name,
    type = 'stock',
    size = 32,
    className = '',
    useGeneric = false
}: SecurityLogoProps) {
    if (useGeneric) return <GenericIcon size={size} className={className} />;

    const displayName = name || getSecurityName(identifier, type);


    // 1. LOOKUP LOCAL MANIFEST
    // We need to generate the slug from the name/identifier to match what the python script did.
    // Ideally this logic is shared, but simple slugification is robust enough.
    const slug = generateSlug(identifier, type);
    const localEntry = MANIFEST[slug];

    // If local entry exists and has a path, use it immediately.
    // This is the "Local First" guarantee.
    if (localEntry && localEntry.exists && localEntry.path) {
        return (
            <img
                src={localEntry.path}
                alt={displayName}
                width={size}
                height={size}
                className={`security-logo ${className}`}
                style={{
                    objectFit: 'contain',
                    // Apply slight dark mode inversion if needed, but 'currentColor' fill implies input injection or mask?
                    // For IMG tags with SVGs, we can't use currentColor easily unless it's a mask or inline.
                    // Simple Icons are usually black. In dark mode we might need filter: invert(1).
                    // Or let the user handle CSS via className.
                }}
            />
        );
    }

    // --- FALLBACK TO API (Brandfetch / Dynamic) ---
    return <DynamicSecurityLogo key={`${identifier}-${type}`} identifier={identifier} type={type} size={size} className={className} altText={displayName} />;
}



/**
 * Sub-component for the API-based fallback (Legacy/Brandfetch)
 */
function DynamicSecurityLogo({ identifier, type, size, className, altText }: any) {
    const isin = getSecurityISIN(identifier, type);
    const brandLogoUrl = BrandService.getLogoUrl(identifier, type, altText, isin);
    const secondaryUrl = BrandService.getFallbackUrl(identifier, type, altText);
    // Try resolving local logo using identifier first, then altText (the name)
    let localLogo = getLocalFallbackLogo(identifier, type);
    if (localLogo === securityLogos.fallback && altText) {
        localLogo = getLocalFallbackLogo(altText, type);
    }
    const isGeneric = localLogo === securityLogos.fallback;

    // Prioritize local logo unless it's the generic one
    const initialSrc = (!isGeneric && localLogo)
        ? localLogo
        : (brandLogoUrl || secondaryUrl || localLogo);

    const [imgSrc, setImgSrc] = React.useState<string>(initialSrc);
    const [fallbackLevel, setFallbackLevel] = React.useState(0);

    // Sync state if initialSrc changes (props updated)
    React.useEffect(() => {
        setImgSrc(initialSrc);
        setFallbackLevel(0);
    }, [initialSrc]);




    const handleError = () => {
        if (fallbackLevel === 0 && secondaryUrl && imgSrc !== secondaryUrl) {
            setImgSrc(secondaryUrl);
            setFallbackLevel(1);
        } else if (fallbackLevel <= 1 && localLogo && imgSrc !== localLogo) {
            setImgSrc(localLogo);
            setFallbackLevel(2);
        } else {
            setFallbackLevel(3);
        }
    };

    if (fallbackLevel === 3) return <GenericIcon size={size} className={className} />;

    return (
        <img
            src={imgSrc}
            alt={altText}
            width={size}
            height={size}
            className={`security-logo ${className}`}
            style={{ objectFit: 'contain', borderRadius: size >= 32 ? '8px' : '4px' }}
            onError={handleError}
        />
    );
}

function GenericIcon({ size, className }: any) {
    return (
        <img
            src={securityLogos.fallback}
            alt="Security"
            width={size}
            height={size}
            className={`security-logo ${className}`}
            style={{ objectFit: 'contain', borderRadius: size >= 32 ? '8px' : '4px' }}
        />
    );
}

// --- HELPERS ---

// MUST match the logic in generate-companies-list.js roughly
function generateSlug(identifier: string, type: string | undefined): string {
    let name = getSecurityName(identifier, type);

    // Special overrides for Funds/Providers
    if (name.includes('iShares')) return 'ishares';
    if (name.includes('Sparindex')) return 'sparindex';
    if (name.includes('Amundi')) return 'amundi';
    if (name.includes('Nordea')) return 'nordea';
    if (name.includes('Danske')) return 'danskebank';
    if (name.includes('Vanguard')) return 'vanguard';

    // Ticker overrides
    const upperId = identifier.toUpperCase();
    if (type === 'crypto') {
        if (upperId === 'BTC' || upperId === 'BITCOIN') return 'bitcoin';
        if (upperId === 'ETH' || upperId === 'ETHEREUM') return 'ethereum';
        if (upperId === 'SOL' || upperId === 'SOLANA') return 'solana';
        if (upperId === 'ADA' || upperId === 'CARDANO') return 'cardano';
        if (upperId === 'XRP') return 'xrp';
        if (upperId === 'DOT' || upperId === 'POLKADOT') return 'polkadot';
        if (upperId === 'MATIC' || upperId === 'POLYGON') return 'polygon';
        if (upperId === 'ALGO' || upperId === 'ALGORAND') return 'algorand';
        if (upperId === 'AVAX' || upperId === 'AVALANCHE') return 'avalanche';
        if (upperId === 'USDT' || upperId === 'TETHER') return 'tether';
        if (upperId === 'LUNA') return 'terra-luna';
        if (upperId === 'LUNC') return 'terra-luna-classic';
        if (upperId === 'PEPE') return 'pepe';
        if (upperId === 'BETH') return 'binance-eth';
    }

    // Specific stock overrides
    if (upperId === 'NOVO-B.CO' || upperId === 'NOVO-B') return 'novonordisk';
    if (upperId === 'MAERSK-B.CO') return 'maersk';

    // Default slugify
    let cleanName = name
        .replace(/\s(Inc\.?|Corp\.?|Corporation|Group|Holdings|Limited|Ltd\.?|A\/S|AB|ASA|PLC|SA|AG)[^a-z]*/gi, '')
        .replace(/\sClass\s[A-Z]/gi, '')
        .replace(/\s(A|B)$/, '')
        .trim();

    return cleanName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function getSecurityName(identifier: string, type: string | undefined): string {
    const upperIdentifier = identifier.toUpperCase();
    if (type === 'stock') {
        const stock = (securityLogos.stocks as any)[upperIdentifier];
        if (stock) return stock.name;

        // Also check ETFs and Funds by ticker if possible
        const etf = Object.entries(securityLogos.etfs).find(([_, data]) => (data as any).isin === identifier || _ === identifier);
        if (etf) return etf[0];

        const fund = Object.entries(securityLogos.funds).find(([_, data]) => (data as any).isin === identifier || _ === identifier);
        if (fund) return fund[0];
    }

    if (type === 'crypto') {
        // Handle crypto names/tickers
        const cryptoLogos: Record<string, string> = {
            'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'SOL': 'Solana', 'ADA': 'Cardano',
            'DOT': 'Polkadot', 'MATIC': 'Polygon', 'ALGO': 'Algorand', 'AVAX': 'Avalanche',
            'USDT': 'Tether', 'LUNA': 'Terra Luna', 'PEPE': 'Pepe', 'BETH': 'Binance ETH'
        };
        return cryptoLogos[upperIdentifier] || identifier;
    }

    return identifier;
}

function getSecurityISIN(identifier: string, type: string | undefined): string | null {
    const upperIdentifier = identifier.toUpperCase();
    const anyLogos = securityLogos as any;
    if (type === 'stock') {
        const stock = anyLogos.stocks?.[upperIdentifier];
        if (stock && stock.isin) return stock.isin;

        // Search in ETFs/Funds
        const etf = Object.values(anyLogos.etfs || {}).find((data: any) => data.isin === identifier);
        if (etf) return (etf as any).isin;

        const fund = Object.values(anyLogos.funds || {}).find((data: any) => data.isin === identifier);
        if (fund) return (fund as any).isin;
    }
    return null;
}

function getLocalFallbackLogo(identifier: string, type: string | undefined): string {
    if (!identifier) return securityLogos.fallback;
    const upperIdentifier = identifier.toUpperCase();
    const name = getSecurityName(identifier, type);
    const lowerName = name.toLowerCase();
    const anyLogos = securityLogos as any;

    if (type === 'crypto') return anyLogos.fallback;

    if (type === 'stock' || type === 'etf' || type === 'fund') {
        if (anyLogos.stocks[upperIdentifier]) return anyLogos.stocks[upperIdentifier].logo;

        // Case-insensitive provider check
        if (lowerName.includes('ishares')) return anyLogos.etfProviders.iShares.logo;
        if (lowerName.includes('amundi')) return anyLogos.etfProviders.Amundi.logo;
        if (lowerName.includes('sparindex')) return anyLogos.fundProviders.Sparindex.logo;
        if (lowerName.includes('nordnet')) return anyLogos.fundProviders.Nordnet.logo;
        if (lowerName.includes('maj invest') || lowerName.includes('majinvest')) return anyLogos.fundProviders['Maj Invest']?.logo || anyLogos.fallback;
    }

    return anyLogos.fallback;
}

export default SecurityLogo;
