# FRONTEND_PLAN.md

## 1) Information Architecture (Navigation)
- Overview (`/`): trust snapshot, latest system health, explainable totals.
- Portfolio (`/portfolio`): holdings, import quality, missing-price clarity.
- Monthly Savings (`/monthly-savings`): plan config, runs, execution lines, manual price override flow.
- Debts (`/debts`): SU debt timeline and postings with seeded-vs-computed clarity.
- Housing Simulation (`/housing`): input form + output cards + audit explain.
- Projection (`/projection`): monthly table, housing toggle, month detail audits.
- Tax (`/tax`): tax run form, breakdown, audit details.

## 2) MVP Screens and Scope
- A. Overview (read-only)
  - Net worth, cash, portfolio, debt cards.
  - Latest `ImportJob` and latest `ExecutionRun` status chips.
  - Explain drawers for net worth and selected totals.
- B. Portfolio (read-only)
  - Holdings table from computed engine output.
  - Missing price state per instrument.
  - Import job panel (status + errors summary).
- C. Monthly Savings (editable + read-only mixed)
  - Editable: plan amount/day/weights and manual execution price override.
  - Read-only: execution history and execution lines.
  - Price rules UI: cached/stub shown; missing indicates manual override required.
- D. Debts (read-only)
  - Debt account summary and posting timeline/table.
  - Explicit label when values come from seeded postings versus computed schedule.
- E. Housing Simulation (editable inputs + computed output)
  - Form submits to housing engine.
  - Upfront/monthly/balance cards with explain drawer.
- F. Projection (editable controls + computed output)
  - Form controls for horizon and housing toggle.
  - Monthly series table first, optional simple chart container.
  - Month detail drawer with audits.
- G. Tax (editable inputs + computed output)
  - Tax input form and result breakdown cards/table.
  - Audit details drawer.

## 3) Data Sources by Screen
- Overview
  - Prisma models: `Transaction`, `ExecutionRun`, `ImportJob`, `DebtPosting`, `Account`, `Price`.
  - Engines/facades: `computeHoldingsFromEvents`, `computeDebtScheduleFromPostings`.
- Portfolio
  - Engine: `computeHoldingsFromEvents`.
  - Prisma models: `Price`, `ImportJob`.
- Monthly Savings
  - Prisma models: `RecurringInvestmentPlan`, `RecurringPlanLine`, `ExecutionRun`, `ExecutionLine`, `Instrument`.
  - Backend APIs: `createRecurringPlan`, `updateRecurringPlan`, `executeRecurringPlanRun`, `setRecurringPlanManualExecutionPrice`.
  - Pricing service behavior: cache/last-known/stub fallback.
- Debts
  - Engine: `computeDebtScheduleFromPostings`.
  - Prisma models: `DebtAccount`, `DebtPosting`, `DebtPlan`.
- Housing
  - Engine: `simulateHomePurchase` + `loadHousingRules`.
- Projection
  - Engine: `runProjection` + `createHousingPurchaseModule` + `loadHousingRules`.
- Tax
  - Engine: `computeTaxSnapshot` (`calculateTax` under the facade).

## 4) Explain Drawer Pattern (Cross-Product)
- Global pattern: right-side drawer (`Sheet`) with:
  - Formula title
  - Context key/value
  - Ordered steps (`label`, `formula`, `value`, `unit`)
  - Notes and assumptions
- Trigger pattern: `Explain` button with info icon on every major derived number.
- Data source rule: drawers consume backend audit payloads only; no frontend recomputation.

## 5) Asset Usage Strategy
- Logo
  - App shell uses lockup in sidebar header and mark in compact/mobile contexts.
  - Variants provided in `/public/assets/logo` (mark, wordmark, lockup, mono).
- Icons
  - Single set: Lucide.
  - One `Icon` wrapper enforces size scale, stroke width, and token color mapping.
- Illustrations
  - Reuse/create minimal SVG line illustrations in `/public/assets/illustrations`.
  - Used only for empty states and educational side panels.
- Asset governance
  - Full map maintained in `docs/ASSET_MAP.md` (file, location, sizing, variants, usage rules).

## 6) Read-Only vs Editable in MVP
- Read-only first: overview, portfolio, debt tables/timelines, projection table output.
- Editable in MVP:
  - Monthly savings plan fields + manual execution override.
  - Housing simulation input form.
  - Projection controls (horizon, housing module toggle).
  - Tax input form.

## 7) Backend Gaps and Wrapper Plan
- Gap 1: SU debt interest accrual engine is not implemented (seeded/sample postings exist).
  - UI action: show warning badge "Accrual engine pending; values reflect recorded postings".
- Gap 2: Live market price provider is not implemented (cache + stub exist).
  - UI action: show source (`cache`, `stub`, `last known`) and manual override call-to-action.
- Gap 3: No dedicated frontend-ready aggregate endpoints yet.
  - Wrapper plan: implement minimal Next route handlers under `/app/api/*` that orchestrate existing TypeScript modules and Prisma reads without duplicating formulas.

## 8) Delivery Sequence
1. Foundation + shell + tokens + primitives.
2. Asset structure + icon wrapper + `docs/ASSET_MAP.md`.
3. Overview + Portfolio.
4. Monthly Savings + Debts.
5. Housing + Projection + Tax.
