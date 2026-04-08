# Import Pipeline (MVP)

## Scope

Implemented now:

- Holdings snapshot CSV import (`holdings`)
- Expenses CSV import (`expenses`)
- Transactions CSV import (`transactions`)
- SU debt postings CSV import (`su-debt`)

Planned later:

- Cross-job dedupe for imports

Canonical contracts are defined in:

- `specs/DATA_CONTRACTS.md`

## Commands

Use Node 20+ in this environment (`.nvmrc` + `npm run check:node`):

```bash
npm run check:node
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:import -- --kind holdings --file /absolute/path/holdings_snapshot.csv --userId <USER_ID>
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:import -- --kind expenses --file /absolute/path/expenses.csv --userId <USER_ID>
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:import -- --kind transactions --file /absolute/path/transactions.csv --userId <USER_ID>
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:import -- --kind su-debt --file /absolute/path/su_debt_postings.csv --userId <USER_ID>
```

Verify end-to-end importer behavior:

```bash
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:verify:imports
```

## Behavior guarantees

- Creates `ImportJob` with source file name, timestamp, mapping JSON, status, and error payload.
- Uses strict validation with row-level error details: `rowIndex`, `field`, `errorCode`, `message`.
- Uses `SUCCESS | PARTIAL | FAILED` status semantics based on imported vs rejected rows.
- Persists holdings into `HoldingsSnapshot` + `HoldingsSnapshotLine` and expenses into `ExpenseLine`.
- Persists transactions into `Transaction`, including `amount` for cash-event fidelity.
- Persists SU postings into `DebtPosting` and links/import-creates `DebtAccount` kind `SU`.
- Auto-creates missing brokerage accounts from `account_name`.
- Matches instruments by ISIN first, then ticker, and creates missing instruments.
- Skips duplicate rows within the same import job using normalized row hash and emits warning.

## Known errors

- `MAPPING_REQUIRED`: required canonical fields could not be mapped from headers.
- `PARSE_ERROR`: invalid date/decimal/currency format.
- `INVALID_ENUM`: enum value outside canonical set.
- `REQUIRED_MISSING`: required field missing for row type.
- `INVALID_VALUE`: numeric/date consistency rule failed.
- `DUPLICATE_ROW_SKIPPED`: duplicate row hash detected in the same import job.
- `DB_WRITE_ERROR`: persistence failure for a row.

## Notes

- In-job dedupe is implemented for transactions; cross-job dedupe is not implemented yet.
- In-job dedupe is implemented for SU debt postings; cross-job dedupe is not implemented yet.
- SU debt imports use `ImportJob.kind=OTHER` in current schema and are distinguished by `sourceFile=su_debt_postings.csv`.
