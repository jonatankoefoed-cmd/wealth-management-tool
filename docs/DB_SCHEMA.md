# DB Schema (v1)

## Overview

This database follows an event-first model: immutable-ish raw events are stored as the financial source of truth (transactions, debt postings, recurring run executions, import jobs), while higher-level figures (holdings, balances, averages, projections) are computed from those events.

Scenarios are stored as lightweight override key/value objects (`ScenarioOverride`) linked to a scenario, not duplicated datasets.

## Runbook

Use a modern Node runtime (Node 20+) when running the commands below.
The repo includes `.nvmrc` and `npm run check:node` for runtime verification.
For fresh environments with existing migrations, use `db:migrate:deploy`.
`db:migrate:init` is only for creating the first migration during initial schema bootstrapping.

```bash
npm run check:node
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:migrate:deploy
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:migrate:init
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:seed
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:verify
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:verify:tax
```

For incremental schema changes after init:

```bash
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:migrate -- --name <migration_name>
```

## Entity Purpose

| Entity | Purpose |
| --- | --- |
| `User` | Root owner for accounts, plans, scenarios, imports, and debt records. |
| `Account` | Financial container (cash, brokerage, debt ledger) used by transactions and plans. |
| `Instrument` | Canonical security master (ISIN/ticker/name/tax bucket) for holdings and plan lines. |
| `Price` | Daily closing prices per instrument for valuation and simulation inputs. |
| `ImportJob` | Audit record for CSV/file imports including mapping and row-level errors. |
| `Transaction` | Raw investment/cash/debt-ledger events (buy/sell/dividend/fee/adjustment). |
| `HoldingsSnapshot` | Point-in-time imported holdings state for reconciliation. |
| `HoldingsSnapshotLine` | Instrument-level quantity and avg cost inside a holdings snapshot. |
| `RecurringInvestmentPlan` | Monthly plan definition (amount, day, status) for paper execution. |
| `RecurringPlanLine` | Instrument allocation weights per recurring plan. |
| `ExecutionRun` | Each scheduled/attempted plan execution event and status. |
| `ExpenseLine` | Recurring or bounded expenses for cashflow calculations. |
| `DebtAccount` | Debt ledger with annual rate and debt type (SU/other). |
| `DebtPlan` | Planned borrowing window and cadence for a debt account. |
| `DebtPosting` | Debt ledger events (disbursement, interest, repayment, adjustment). |
| `Scenario` | Named simulation context (base or alternative). |
| `ScenarioOverride` | Typed JSON override values for assumptions within a scenario. |

## Auditability Notes

- Import provenance is preserved via `ImportJob` and optional foreign keys from transactions, snapshots, expenses, and debt postings.
- Recurring plan execution is auditable via `ExecutionRun` and linked `Transaction.executionRunId`.
- Debt state is reproducible from ordered `DebtPosting` events plus plan metadata.
- Holdings can be derived from transactions and reconciled against imported `HoldingsSnapshot` records.
- Scenario changes are traceable as explicit key-level overrides (`ScenarioOverride`).
- Tax rule loading is validated at runtime before computation (`validateTaxRulesShape`).

## Postgres Compatibility Notes

- Schema uses Prisma-supported scalar and relation types (`Decimal`, `Json`, `DateTime`, enums) that map cleanly to Postgres.
- No SQLite-only SQL features, triggers, or custom functions are used.
- Indexes and unique constraints are declared in Prisma schema, so they migrate consistently to Postgres.
- Monetary and quantity fields use `Decimal` to avoid float drift across providers.

## Deviation Note

The provided schema text was implemented as-is for models/fields/enums, with two minimal compile-time additions required by Prisma relation rules:

- Added inverse relation arrays on `User` for models that already carry `userId` foreign keys.
- Added inverse relation array `ImportJob.debtPostings` to pair with `DebtPosting.importJob`.
