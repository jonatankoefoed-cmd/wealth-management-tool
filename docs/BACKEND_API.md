# Backend API Facade (MVP)

## Purpose

`src/backend/api.ts` exposes a typed backend facade that frontend code can call through a thin HTTP layer later.
No UI and no transport assumptions are baked in.

## Mutations

- `createRecurringPlan(prisma, input)` creates a plan and validated allocation lines.
- `updateRecurringPlan(prisma, input)` updates plan fields and optionally replaces lines.
- `executeRecurringPlanRun({ planId, targetMonth, force? })` triggers paper execution.
- `setRecurringPlanManualExecutionPrice({ executionLineId, manualPrice, note? })` applies manual fill override.
- `upsertDebtPlan(prisma, input)` creates/updates borrowing plan for a debt account.
- `createDebtPosting(prisma, input)` creates one debt posting event.

## Derived Reads

- `computeHoldingsFromEvents(prisma, { userId, asOfDate? })`
  - Baseline from latest holdings snapshot
  - Applies post-snapshot BUY/SELL transactions with weighted average cost
  - Returns positions, warnings, and calculation audit steps
- `computeDebtScheduleFromPostings(prisma, { userId, debtAccountId?, startMonth?, endMonth? })`
  - Aggregates debt postings month-by-month
  - Returns opening/closing balances and audit formula rows
- `computeTaxSnapshot(input)` runs tax engine and returns audited tax output.

## Tax Rule Locking

`src/lib/tax/taxRules.ts` validates rule JSON before caching/loading:

- required top-level sections
- required numeric fields/ranges
- enum-like fields (income type, taxation principle)

Invalid rule files fail fast with explicit validation errors.

## Verification

```bash
npm run check:node
PATH=$HOME/.nvm/versions/node/v20.19.6/bin:/opt/homebrew/bin:$PATH npm run db:verify:tax
```
