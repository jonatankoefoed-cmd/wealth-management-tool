# CALC_ENGINE.md

Personal Wealth Management Web App
Version 1.0

## 1) Purpose

Define the deterministic calculation engine for:

* Portfolio positions (holdings, average cost, PnL)
* Monthly investment plan (paper execution)
* SU debt engine (disbursement + monthly interest accrual)
* Projections on a monthly timeline (base and scenarios)
* A consistent audit-trail output format for explainability

Non negotiables:

* Event-first truth model: events are stored, derived values are computed.
* Derived outputs must be explainable via audit steps.
* Monthly timeline is canonical.
* The engine must be deterministic and testable.

---

## 2) Canonical timeline

### 2.1 Time granularity

* Canonical granularity: monthly
* Canonical month key: `YYYY-MM` (e.g. 2026-02)

### 2.2 Date conventions

* All persisted event dates are stored as DateTime, but projection uses month buckets.
* For month calculations: define `monthStart` = first day, `monthEnd` = last day.
* Convention: recurring plan execution occurs on `dayOfMonth` (clamped to month end if day exceeds days in month).

---

## 3) Inputs and sources of truth

### 3.1 Event sources

Truth sources:

1. Transactions (BUY/SELL/DIVIDEND/FEE/ADJUSTMENT)
2. Debt postings (DISBURSEMENT/INTEREST/REPAYMENT/ADJUSTMENT)
3. Plan definitions and execution runs
4. CSV imports (holdings snapshots, expenses, transactions if imported)

Derived only:

* Holdings positions
* Average cost
* Portfolio market value
* Net worth
* Projection paths

### 3.2 Holdings snapshots versus transactions

MVP rule:

* If a holdings snapshot exists, it establishes a baseline position at `as_of_date`.
* Transactions after the snapshot date are applied on top of that snapshot.
* Transactions before or on the snapshot date do not rewrite the snapshot in MVP.

Later rule (optional):

* Full recompute purely from transactions can be introduced once transactions coverage is complete.

---

## 4) Portfolio engine

### 4.1 Position state per instrument (per account)

Maintain a state object:

* `qty` (Decimal)
* `avgCost` (Decimal, per unit)
* `costCurrency` (string)
* `realizedPnl` (Decimal, optional)
* `lastUpdatedDate` (DateTime)

### 4.2 Average cost method

Use weighted average cost.

BUY handling:

* Effective buy cost in base currency: `buyValue = qty * price + fees`
* New qty: `qtyNew = qtyOld + qtyBuy`
* New total cost: `costOld = qtyOld * avgCostOld`
* `costNew = costOld + buyValue`
* New average cost: `avgCostNew = costNew / qtyNew`

SELL handling:

* Proceeds: `sellValue = qtySell * price - fees`
* Cost removed (average cost): `costRemoved = qtySell * avgCostOld`
* Realized PnL (optional): `sellValue - costRemoved`
* New qty: `qtyNew = qtyOld - qtySell`
* avgCost remains unchanged if qtyNew > 0, else reset to 0

Fees rule:

* Fees increase cost basis for BUY.
* Fees reduce proceeds for SELL.

Validation:

* Reject a SELL if `qtySell > qtyOld` unless you explicitly allow short positions (MVP: do not allow shorts).

### 4.3 Dividends and cash events

Dividend handling:

* If dividends are stored as transactions, they do not alter `qty` or `avgCost`.
* They affect cashflow and tax (later).

Fee handling without instrument:

* Fees stored as cash events. Do not change holdings.

Adjustment:

* Used for manual corrections. Must be explicitly labeled and auditable.

---

## 5) Price engine (MVP)

### 5.1 Market value computation

Market value for an instrument at a date:

* Use price on that date if available.
* Else use last known prior price.
* Else mark as missing and exclude from totals (but still show the position).

### 5.2 Price provenance

Store price source:

* manual
* import
* api (future)

Audit must show:

* which price was used
* date of the price

---

## 6) Monthly plan engine (paper execution)

### 6.1 Inputs

A plan includes:

* amountDkk (Decimal)
* dayOfMonth (Int)
* status (ACTIVE/PAUSED)
* lines: instrumentId + weightPct

### 6.2 Execution scheduling

Scheduled execution date per month:

* `scheduledDate = clamp(dayOfMonth, monthEndDay)`
* Execute once per month per plan.

Idempotency rule:

* Before executing, check if an `ExecutionRun` exists for `(planId, scheduledDate)`.
* If exists, do not create another. Return existing run.

### 6.3 Allocation logic

For each line:

* `lineAmount = amountDkk * (weightPct / 100)`
* Rounding:

  * Currency amounts: 2 decimals
  * Quantities: 6 decimals
* Any rounding leftover:

  * assign remainder to the highest-weight line (MVP), record in audit.

### 6.4 Quantity calculation

If price is available:

* `qty = (lineAmount - feesLine) / price`

FeesLine:

* MVP default = 0
* If later you add per-trade fees, allocate fees per line or apply a single fee event.

### 6.5 Transaction creation

For each successfully executed line:

* Create a BUY transaction with:

  * instrumentId set
  * quantity set
  * price used
  * feesLine
  * currency = DKK (or price currency if you store that)
  * source = "monthly_plan"
  * executionRunId set

### 6.6 Execution status rules

* SUCCESS: all lines executed
* PARTIAL: at least one line executed and at least one line failed (missing price or validation issue)
* FAILED: no lines executed
* SKIPPED: plan paused or scheduled date not reached (used by scheduler, not manual run)

Failure reasons must be recorded in ExecutionRun.note and audit steps.

---

## 7) SU debt engine

### 7.1 Debt posting types

Truth events:

* DISBURSEMENT: increases principal
* INTEREST: increases principal
* REPAYMENT: decreases principal (negative amount)
* ADJUSTMENT: explicit correction

### 7.2 Monthly accrual convention (MVP)

Annual rate is stored on the debt account (e.g. 0.04 during studies).
Monthly rate: `r_m = annualRate / 12`

Accrual rule:

* Interest is calculated on opening balance of the month.
* Interest is posted at month end.

Given opening balance `B_open`:

* `interest = B_open * r_m`
* `B_close = B_open + interest + disbursements + adjustments + repayments`

Posting dates:

* DISBURSEMENT: on plan day of month (configurable)
* INTEREST: on month end date

### 7.3 Debt plan generation

Debt plan includes:

* startMonth (DateTime, first month to borrow)
* endMonth (DateTime, last month to borrow)
* amountPerMonth (Decimal)
* dayOfMonth (Int)
* status

Generation rule (MVP):

* For each month between start and end inclusive:

  * create DISBURSEMENT posting on clamped dayOfMonth
* For each month on the projection horizon:

  * create INTEREST posting at month end based on opening balance

Idempotency:

* Debt plan generation must not duplicate postings. Use unique keys per month and posting type (enforced in service logic).

### 7.4 Display balance

Debt balance at date is computed by summing postings amounts up to date:

* `balance(date) = sum(postings.amount where posting.date <= date)`

---

## 8) Projection engine (monthly)

### 8.1 Projection components

Projection produces month-by-month series for:

* income
* expenses
* invest contributions
* portfolio value (optional if prices/returns model applied)
* debt balance
* net worth

### 8.2 Base projection flow per month

For each month t:

1. Apply salary/income model for month t
2. Apply expense model for month t
3. Apply savings rate schedule to compute invest contribution
4. Apply monthly plan executions (paper) to create planned transactions in projection context
5. Apply return model to portfolio value (MVP: simple monthly compounding)
6. Apply debt disbursements and interest accrual
7. Compute net worth

MVP return model:

* Use an annual expected return `r_a`, convert to monthly: `r_m = (1 + r_a)^(1/12) - 1`
* Apply to portfolio value at month end
* Audit must show the return factor used

### 8.3 Scenario model

Scenario is a set of overrides applied on top of base assumptions.

Rules:

* Base scenario always exists.
* Overrides are keyed. If override exists, it replaces base value for projection only.
* Overrides do not mutate historical data.

---

## 9) Scenario override keys (canonical)

All overrides are stored as key-value JSON.

Recommended keys and shapes:

1. Salary model:

* `salary.baseMonthly` -> number
* `salary.growthModel` -> { "type": "curve", "points": [{ "year": 2026, "multiplier": 1.0 }, ...] }
* `salary.bonusPct` -> number

2. Savings schedule:

* `savings.rateSchedule` -> [{ "month": "YYYY-MM", "rate": 0.25 }, ...]

3. Returns:

* `returns.expectedAnnual` -> number
* `returns.volatilityAnnual` -> number (optional, later)

4. Expenses:

* `expenses.scaleFactor` -> number (e.g. 1.05)

5. SU debt:

* `debt.suAnnualRate` -> number
* `debt.suBorrowAmountMonthly` -> number
* `debt.suBorrowEndMonth` -> "YYYY-MM"

All keys must be documented and stable. UI must only write to known keys.

---

## 10) Audit trail output format (mandatory)

Every derived number shown in UI must be backed by an audit object.

### 10.1 Audit object

Return shape:

* `auditId` (string)
* `title` (string)
* `context` (object: accountId, instrumentId, month, scenarioId)
* `inputs` (array)
* `steps` (array)
* `outputs` (array)
* `notes` (array)

Each input:

* `label`, `value`, `unit`, `source` (import|manual|assumption|derived)

Each step:

* `label`
* `formula` (string, human-readable)
* `value`
* `unit`

Each output:

* `label`, `value`, `unit`

### 10.2 Example: SU interest month

Title: "SU interest accrual for 2026-03"
Inputs:

* Opening balance, annual rate
  Steps:
* monthly rate = annual / 12
* interest = opening * monthly rate
  Outputs:
* interest posted, closing balance

### 10.3 Example: Monthly plan line execution

Title: "Monthly plan execution line for SWDA in 2026-02"
Inputs:

* plan amount, weight, price used
  Steps:
* lineAmount = amount * weight
* qty = lineAmount / price
  Outputs:
* BUY transaction fields

Audit objects must be persisted or computed on demand, but the format must be consistent everywhere.

---

## 11) Testing requirements (engine level)

Minimum tests (golden cases):

1. Weighted average cost across multiple buys
2. Sell reduces qty and keeps avg cost stable
3. Monthly plan execution creates correct transactions and handles missing price as PARTIAL
4. SU interest accrual matches opening balance convention
5. Projection applies scenario overrides without mutating base

---

## 12) MVP boundaries

This engine explicitly does not implement:

* full Danish tax rule complexity (separate TAX engine spec)
* multi-currency FX conversions beyond labeling (future)
* broker-grade corporate actions (splits, mergers) beyond adjustments (future)

End of file.
