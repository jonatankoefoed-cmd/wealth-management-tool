# MONTHLY_SAVINGS_SHADOW_EXECUTION.md

Personal Wealth Management Web App
Version 1.0

## 1) Purpose

This spec defines the backend execution engine for shadow (paper) monthly savings plans. The engine:

1. Executes monthly savings plans on a scheduled day (default: 8th of month)
2. Uses price quotes to calculate buy quantities
3. Creates BUY transactions that integrate with the existing portfolio engine
4. Supports manual price override to reconcile with actual broker fills
5. Is idempotent, auditable, and testable

---

## 2) Execution Schedule

### 2.1 Day of Month Rule

Default execution day: `8` (configurable per plan via `dayOfMonth`)

Weekend fallback:
- If 8th falls on Saturday → execute on Monday (8th + 2)
- If 8th falls on Sunday → execute on Monday (8th + 1)

### 2.2 Target Month

Target month format: `YYYY-MM` (e.g., `2026-02`)

The execution run is uniquely identified by `(planId, targetMonth)`.

---

## 3) Execution Run States

### 3.1 RunStatus

| Status | Description |
|--------|-------------|
| `SUCCESS` | All lines executed successfully |
| `PARTIAL` | At least one line executed, at least one failed |
| `FAILED` | No lines executed |
| `SKIPPED` | Plan paused or date not reached |

### 3.2 ExecutionLine States

| Status | Description |
|--------|-------------|
| `EXECUTED` | Line executed with price quote |
| `FAILED` | Line failed (missing price, validation error) |
| `OVERRIDDEN` | Manual price override applied |

---

## 4) "Actuals Win" Override Rule

When a manual price override is applied:

1. The `ExecutionLine.manualPriceOverride` is set
2. The linked `Transaction.price` is updated to match
3. The line status changes to `OVERRIDDEN`
4. Quantity remains unchanged (represents actual units purchased)
5. Override timestamp and note are recorded

---

## 5) Allocation Logic

### 5.1 Weight Validation

Sum of all line weights must equal 100% (tolerance: 0.01)

### 5.2 Amount Allocation

```
lineAmount = totalAmount * (weightPct / 100)
```

Rounding rules:
- Currency amounts: 2 decimal places
- Quantities: 6 decimal places

### 5.3 Remainder Distribution

Any rounding remainder is added to the highest-weight line.

---

## 6) Quantity Calculation

```
quantity = lineAmount / quotePrice
```

Where:
- `quotePrice` is the price quote for the instrument on execution date
- Quantity is rounded to 6 decimal places

---

## 7) Price Quote Sources

Priority order:
1. Cached quote from `Price` table for (instrumentId, date)
2. Provider fetch (Yahoo Finance, manual, etc.)
3. Missing → line status = FAILED

Quote source tracking:
- `quoteSource`: "cache" | "yahoo" | "manual" | "stub"

---

## 8) Transaction Creation

For each successfully executed line, create a `Transaction`:

```
type: BUY
instrumentId: line.instrumentId
accountId: plan.accountId
quantity: calculated quantity
price: quotePrice
fees: 0 (MVP)
currency: "DKK"
date: executionDate
source: "monthly_plan_shadow"
executionRunId: run.id
```

---

## 9) Idempotency

Before execution:
1. Check for existing `ExecutionRun` with matching `(planId, targetMonth)`
2. If exists and `force = false` → return existing run
3. If exists and `force = true` → skip (or optionally re-execute)

---

## 10) Audit Trail Format

Matches CALC_ENGINE.md structure:

```json
{
  "title": "Monthly plan execution for 2026-02",
  "context": {
    "planId": "...",
    "targetMonth": "2026-02",
    "executionDate": "2026-02-10"
  },
  "inputs": [
    { "label": "Total amount", "value": 5000, "unit": "DKK", "source": "plan" }
  ],
  "steps": [
    { "label": "NOVO-B allocation", "formula": "5000 * 0.40", "value": 2000, "unit": "DKK" },
    { "label": "NOVO-B quantity", "formula": "2000 / 850", "value": 2.352941, "unit": "shares" }
  ],
  "outputs": [
    { "label": "Transactions created", "value": 3, "unit": "count" }
  ],
  "notes": []
}
```

---

## 11) Data Model Extensions

### 11.1 ExecutionRun (extend existing)

Add fields:
- `targetMonth` (String, "YYYY-MM")
- `totalAmount` (Decimal)
- `auditJson` (Json, optional)

Add unique index: `(planId, targetMonth)`

### 11.2 ExecutionLine (new model)

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| runId | String (FK) | Links to ExecutionRun |
| instrumentId | String (FK) | Target instrument |
| weightPct | Decimal | Weight percentage |
| targetAmount | Decimal | Calculated amount |
| quotePrice | Decimal? | Price used |
| quoteSource | String? | Price source |
| quantity | Decimal? | Calculated quantity |
| status | String | EXECUTED/FAILED/OVERRIDDEN |
| failureReason | String? | Error message if failed |
| manualPriceOverride | Decimal? | Override price |
| manualNote | String? | Override note |
| overriddenAt | DateTime? | Override timestamp |
| transactionId | String? | Link to created transaction |

---

## 12) API Surface

### 12.1 Execute Shadow Run

```typescript
executeShadowMonthlySavings(args: {
  planId: string;
  targetMonth: string;
  force?: boolean;
}): Promise<{ runId: string; status: RunStatus }>
```

### 12.2 Set Manual Override

```typescript
setManualExecutionPrice(args: {
  executionLineId: string;
  manualPrice: number;
  note?: string;
}): Promise<{ lineId: string }>
```

---

## 13) Testing Requirements

Minimum test cases:

1. **Weekday execution**: 8th on weekday creates SUCCESS run
2. **Weekend fallback**: 8th on Saturday/Sunday moves to Monday
3. **Remainder allocation**: Rounding remainder added to largest weight
4. **Missing price**: Results in PARTIAL with failed line
5. **Manual override**: Updates transaction price, line becomes OVERRIDDEN

---

## 14) Broker Agnosticism

This module is intentionally broker-agnostic:
- No Nordnet API integration
- No email/Gmail parsing
- Shadow execution only

Actual broker fills are reconciled via manual override.

---

End of file.
