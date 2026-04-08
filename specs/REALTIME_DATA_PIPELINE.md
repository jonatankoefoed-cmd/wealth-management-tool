# REALTIME_DATA_PIPELINE.md

Personal Wealth Management Web App
Version 2.0 (Updated 2026-02-08)

## 1) Executive Summary

**Goal:** Fetch "live" prices for all holdings (Stocks, ETFs, Crypto) and Danish mortgage bond rates without monthly fees.

**Strategy:** Hybrid approach.
1.  **Crypto:** Direct connection to Binance API (Real-time, free).
2.  **Stocks/ETFs:** Usage of Yahoo Finance (Delayed ~15 min, free) via `yahoo-finance2`.
3.  **Mortgage Rates:** Finans Danmark weekly data (cached 24h).

**Why not official Nasdaq Nordic real-time?** It requires expensive monthly subscriptions (approx $50-100/mo for API access). For a personal tool, 15-minute delay on stocks is the standard trade-off for "free".

## 2) Architecture

### 2.1 Module Structure
```
src/lib/prices/
├── index.ts              # Module exports
├── types.ts              # TypeScript interfaces
├── priceService.ts       # Main entry point with caching
├── yahooFinanceClient.ts # Stock/ETF quotes
├── binanceClient.ts      # Crypto quotes
├── mortgageRateService.ts# Danish realkredit rates
└── tickerMapping.ts      # ISIN → API ticker mapping

src/data/
└── ticker-map.json       # ISIN to Yahoo/Binance mappings
```

### 2.2 Data Sources
| Asset Type | Source | Delay | Cache TTL |
|------------|--------|-------|-----------|
| Stocks/ETFs | yahoo-finance2 | ~15 min | 5 min |
| Crypto | Binance API | Real-time | 10 sec |
| Mortgage Rates | Finans Danmark | Weekly | 24 hours |

## 3) Ticker Mapping

**Problem:** Nordnet exports use ISIN (e.g., `DK0060534915`), but APIs need Tickers (e.g., `NOVO-B.CO`).

**Solution:** `src/data/ticker-map.json` with mappings by asset type.

**Exchange Suffixes:**
- Danish: `.CO` (Copenhagen)
- Swedish: `.ST` (Stockholm)
- German: `.DE` (Frankfurt)
- US: No suffix

## 4) Usage

```typescript
import { getPrice, getBatchPrices, getMortgageRates } from '@/lib/prices';

// Single stock
const novo = await getPrice('NOVO-B.CO', 'stock');

// Batch crypto
const crypto = await getBatchPrices(['BTCUSDT', 'ETHUSDT'], 'crypto');

// Mortgage rates
const rates = await getMortgageRates();
console.log(rates.maturities['15Y']); // 5.10%
```

## 5) Mortgage Bond Rates

Danish realkredit rates from Finans Danmark:
- **Short DKK:** F-lån, variable rates
- **Long DKK:** Fastforrentede (5Y, 10Y, 15Y, 20Y, 30Y)
- **Short EUR:** Euro-denominated variable

```typescript
import { calculateMonthlyPayment } from '@/lib/prices';

const result = await calculateMonthlyPayment(
  2_000_000,  // 2M DKK principal
  30,         // 30 year term
  'fixed'     // fixed rate
);
// { payment: 10850, rate: 5.35 }
```

## 6) Frontend Integration

Use SWR or React Query with polling:
- Stocks: Every 60-300 seconds
- Crypto: Every 10-30 seconds
- Show "Delayed 15 min" indicator for stocks (High Trust principle)

## 7) Limits & Risks

*   **Yahoo Finance API:** Unofficial, can break.
    *   *Mitigation:* `yahoo-finance2` library handles updates.
*   **Rate Limits:** Strict caching prevents API hammering.
*   **Finans Danmark:** Excel format, manual parsing required.
    *   *Mitigation:* Static fallback with periodic manual updates.

