# DATA_CONTRACTS.md

Personal Wealth Management Web App
Version 1.0

## 1) Purpose

This document defines the canonical data contracts for CSV imports and manual inputs used by the app:

* Holdings snapshot import (current portfolio state)
* Transactions import (optional but supported)
* Expenses import (budget baseline)
* SU debt import (optional, if you later import statements)
* Mapping rules (how unknown headers map to canonical fields)
* Validation rules and error semantics
* Import job metadata and audit trail

Non negotiables:

* Import must be auditable: preserve original file name, import timestamp, column mapping, and row-level errors.
* Imports must not silently mutate data. If a row is ambiguous, it must be rejected or flagged.
* Canonical fields must be stable over time.

Base currency: DKK (but instrument/account currency may differ).

---

## 2) Import types

### 2.1 HOLDINGS SNAPSHOT CSV (required for MVP usefulness)

Purpose: Import the current portfolio state (quantity + average cost per instrument) at an as-of date.
This enables immediate snapshot and simulation even without transactions.

Canonical file: `holdings_snapshot.csv`

#### Required canonical columns

* `as_of_date` (YYYY-MM-DD)
* `account_name` (string; e.g. "Nordnet Depot")
* `instrument_name` (string)
* `ticker` (string, optional if ISIN exists)
* `isin` (string, optional if ticker exists)
* `asset_type` (STOCK|ETF|FUND|OTHER)
* `quantity` (decimal)
* `avg_cost` (decimal, per unit)
* `cost_currency` (ISO 4217; default DKK)

#### Optional canonical columns

* `instrument_currency` (ISO 4217)
* `tax_bucket` (EQUITY_INCOME|CAPITAL_INCOME|UNKNOWN)
* `note` (string)

#### Example rows

as_of_date,account_name,instrument_name,ticker,isin,asset_type,quantity,avg_cost,cost_currency,instrument_currency,tax_bucket
2026-02-08,Nordnet Depot,iShares Core MSCI World UCITS ETF,SWDA,IE00B4L5Y983,ETF,12.50,650.00,DKK,DKK,UNKNOWN
2026-02-08,Nordnet Depot,Apple Inc,AAPL,US0378331005,STOCK,4.00,1450.00,DKK,USD,EQUITY_INCOME

#### Notes

* Either `isin` or `ticker` must be present per row.
* `avg_cost` is the average entry price per unit in `cost_currency`.
* If `instrument_currency` is missing, assume same as `cost_currency`.

---

### 2.2 TRANSACTIONS CSV (optional, recommended later)

Purpose: Import trades and cash events for auditability and proper performance tracking.
Canonical file: `transactions.csv`

#### Required canonical columns

* `date` (YYYY-MM-DD)
* `account_name`
* `type` (BUY|SELL|DIVIDEND|FEE|ADJUSTMENT)
* `instrument_name` (required for BUY/SELL/DIVIDEND; optional for FEE/ADJUSTMENT)
* `ticker` (optional if ISIN exists)
* `isin` (optional if ticker exists)
* `quantity` (decimal; required for BUY/SELL; optional for DIVIDEND)
* `price` (decimal; required for BUY/SELL; optional for DIVIDEND)
* `fees` (decimal; default 0)
* `currency` (ISO 4217; default DKK)

#### Optional canonical columns

* `amount` (decimal; for DIVIDEND/FEE/ADJUSTMENT when quantity/price not applicable)
* `source` (string; e.g. "nordnet_import")
* `note` (string)

#### Example rows

date,account_name,type,instrument_name,ticker,isin,quantity,price,fees,currency,amount,source
2026-02-08,Nordnet Depot,BUY,iShares Core MSCI World UCITS ETF,SWDA,IE00B4L5Y983,1.00,650.00,0.00,DKK,,nordnet_import
2026-02-08,Nordnet Depot,FEE,,,,,,0.00,DKK,29.00,nordnet_import
2026-02-15,Nordnet Depot,DIVIDEND,Apple Inc,AAPL,US0378331005,,,0.00,DKK,45.00,nordnet_import

#### Notes

* Either `isin` or `ticker` must be present for instrument-linked types.
* For SELL, quantity should be positive; the app infers direction from `type`.
* The app stores these rows as `Transaction` events, not as holdings.

---

### 2.3 EXPENSES CSV (required for cashflow baseline)

Purpose: Define expected recurring expenses and allow projections.
Canonical file: `expenses.csv`

#### Required canonical columns

* `category` (string; e.g. "Rent", "Food", "Transport")
* `name` (string; e.g. "Apartment rent")
* `amount` (decimal)
* `currency` (ISO 4217; default DKK)
* `frequency` (MONTHLY|QUARTERLY|ANNUAL)
* `start_date` (YYYY-MM-DD; optional but recommended)

#### Optional canonical columns

* `end_date` (YYYY-MM-DD)
* `note` (string)

#### Example rows

category,name,amount,currency,frequency,start_date,end_date
Housing,Rent,9000,DKK,MONTHLY,2026-02-01,
Food,Groceries,3000,DKK,MONTHLY,2026-02-01,
Insurance,Home insurance,2400,DKK,ANNUAL,2026-02-01,

---

### 2.4 SU DEBT IMPORT (optional, not required for MVP)

Purpose: Import known SU debt balance or postings if you have statements.
Canonical file: `su_debt_postings.csv`

#### Required canonical columns

* `date` (YYYY-MM-DD)
* `type` (DISBURSEMENT|INTEREST|REPAYMENT|ADJUSTMENT)
* `amount` (decimal; positive increases debt, negative decreases)
* `currency` (ISO 4217; default DKK)
* `note` (optional)

#### Example rows

date,type,amount,currency,note
2026-03-01,DISBURSEMENT,3799,DKK,Monthly SU loan
2026-03-31,INTEREST,12.66,DKK,Monthly accrual

---

## 3) Header mapping rules (import wizard)

The app must support flexible source headers by mapping them to canonical fields.

### 3.1 Mapping steps

1. Parse CSV header row.
2. Attempt auto-map by:

   * case-insensitive match
   * ignoring spaces, underscores, hyphens
   * common aliases list
3. If any required field unmapped:

   * require user to map manually (UI)
4. Save mapping JSON to `ImportJob.mappingJson`.

### 3.2 Common aliases (examples)

Holdings snapshot:

* `instrument_name`: ["name","security","instrument","paper","valuepapir","fund","etf"]
* `ticker`: ["symbol","ticker"]
* `isin`: ["isin","isin_code"]
* `quantity`: ["qty","antal","units","shares"]
* `avg_cost`: ["avg_price","average_cost","gennemsnitskurs","cost_basis","avg_kurs"]
* `as_of_date`: ["date","asof","as_of","snapshot_date"]

Transactions:

* `date`: ["trade_date","execution_date","dato"]
* `type`: ["transaction_type","side","buy/sell","kategori"]
* `fees`: ["fee","commission","kurtage","omkostninger"]
* `amount`: ["cash_amount","beløb"]

Expenses:

* `amount`: ["value","cost","beløb"]
* `frequency`: ["cadence","interval","period"]

### 3.3 Type normalization

* Trim whitespace
* Convert decimal comma to dot if needed (e.g. "1.234,56" to "1234.56" depending on locale)
* Remove currency symbols (e.g. "DKK 3.799" -> 3799)
* Normalize frequency and enums to canonical set

---

## 4) Validation rules (strict)

### 4.1 Global validations

* File must have header row
* UTF-8 preferred
* Max row count configurable (MVP default 50k)
* Reject rows with non-parsable decimals/dates in required columns

### 4.2 Holdings snapshot validations

Reject a row if:

* `as_of_date` missing or invalid
* `account_name` missing
* both `isin` and `ticker` missing
* `quantity` missing or <= 0
* `avg_cost` missing or < 0
* `asset_type` not in allowed set

Warn (allow) if:

* `tax_bucket` missing -> set UNKNOWN
* `instrument_currency` missing -> assume cost_currency

### 4.3 Transactions validations

Reject a row if:

* `date` missing
* `type` invalid
* BUY/SELL missing instrument identifier (isin or ticker)
* BUY/SELL missing quantity or price
* currency missing -> default DKK (warn)

### 4.4 Expenses validations

Reject a row if:

* category or name missing
* amount missing or < 0
* frequency invalid

---

## 5) Error semantics and reporting

### 5.1 ImportJob status rules

* SUCCESS: all rows imported with no rejects
* PARTIAL: some rows imported, some rejected (row-level errors captured)
* FAILED: zero rows imported due to global parsing errors or mapping failure

### 5.2 Row-level errors

For rejected rows:

* store `rowIndex` (1-based, excluding header)
* store `field`
* store `errorCode` (e.g. REQUIRED_MISSING, PARSE_ERROR, INVALID_ENUM)
* store `message` (human readable)

Row-level errors must be stored in `ImportJob.errorsJson`.

---

## 6) Persistence mapping to DB (requirements)

### 6.1 Accounts

* `account_name` must map to an `Account` record.
* If no account exists, create it under the user with:

  * type = BROKERAGE for holdings/transactions
  * currency default DKK

### 6.2 Instruments

* Instruments are matched by ISIN first, then ticker.
* If instrument does not exist:

  * create `Instrument` with name + asset_type + currency if known
  * tax_bucket defaults UNKNOWN

### 6.3 Holdings snapshot

* For each holdings file, create one `HoldingsSnapshot` per distinct (as_of_date, account_name).
* Create `HoldingsSnapshotLine` rows per instrument.

### 6.4 Transactions

* Create `Transaction` rows, linking to account and instrument if applicable.

### 6.5 Expenses

* Create `ExpenseLine` rows.

---

## 7) MVP import UX requirements (no styling detail)

* Import Wizard supports:

  1. File upload
  2. Auto-mapping preview
  3. Manual mapping if required fields missing
  4. Validation summary (imported count, rejected count)
  5. “Download error report” (CSV or JSON)
* Show “Last imported at” timestamps per import kind.

End of file.
