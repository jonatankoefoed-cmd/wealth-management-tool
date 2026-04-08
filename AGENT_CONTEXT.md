Personal Wealth Management Web App
Version 1.0

## 1) Product goal

Build a personal wealth management web app that gives:

1. A snapshot of current financial position (assets, liabilities, cashflow, tax outlook).
2. Simulations of future outcomes based on choices made today (savings rate schedule, salary progression, investment contributions, returns).
3. Explainable tax and debt logic with audit trail, so every number can be traced back to inputs.

Primary use case: I actively manage monthly investing plans and want real-time overview driven by my inputs and CSV imports (holdings and expenses). The app must support a “paper execution” approach for recurring investments. The app must track SU debt with monthly interest accrual and planned new borrowings until 1 July.

## 2) Non negotiables

* Clinical, minimalist, high-trust finance UI inspired by Revolut and OpenAI.
* No emojis. No playful UI. No marketing language.
* Soft geometry: rounded corners everywhere and smooth charts.
* Auditability: every key output must be explainable via expandable calculation steps.
* Consistency: same component patterns across modules.
* The product must feel calm, precise, and financially serious.

## 3) Design and UI rules

### Visual style

* Neutral palette, sparse accent.
* Large whitespace, grid-based layout (8px system).
* Rounded cards and inputs. Subtle shadows only.
* Typography must be modern, neutral, and number-friendly (tabular numerals preferred).

### Interaction style

* Snapshot first, drill-down second.
* Prefer side panels and inline expansion over heavy modals.
* Collapsible “Calculation steps” sections are default collapsed.
* Clear disabled states and validation messages, never noisy.

### Charts

* Smooth lines, minimal gridlines, muted colors.
* Highlight only one series at a time.
* Rounded chart containers and clean axes.

## 4) Core product loop

Snapshot (now) -> scenario change (input) -> simulation output (future) -> tax and debt impact -> plan action -> updated snapshot.

The user must always be able to:

* See current state instantly.
* Adjust assumptions quickly.
* Compare outcomes clearly.

## 5) Modules and scope for MVP

### Overview

* Net worth snapshot (assets minus liabilities).
* Monthly cashflow snapshot.
* Portfolio snapshot (value, allocation).
* Tax snapshot (expected payable).
* Debt snapshot (SU debt included).

### Investments

* Import holdings snapshot from CSV.
* Show holdings with average cost, quantity, market value (if prices exist), and P&L.
* Recurring investment plan (monthly plan) that can be edited (amount, execution day, allocation weights).
* Paper execution that creates internal transactions and updates holdings.

### Debt

* SU debt engine with monthly interest accrual.
* A plan to add SU borrowing monthly until 1 July.
* Clear month-by-month schedule and audit trail.

### Simulations

* Scenario drawer with overrides:

  * savings rate schedule by year or month
  * salary progression model (including high growth path)
  * return assumptions
* Outputs: net worth in 5, 10, 15 years, tax payable trend, liquidity trend.

### Tax (MVP level)

* Show tax breakdown structure and explainability.
* Start with a transparent baseline implementation.
* Prefer audit trail and clarity over edge-case completeness.

## 6) Data principles

* Store raw inputs and transactions.
* Derive computed outputs (holdings, averages, projections) from stored inputs.
* Scenarios must be overrides, not full duplicated datasets.
* Validation must exist for missing critical fields (currency, quantity, avg cost, dates).

## 7) What NOT to do in MVP

* Do not attempt real broker integration or execute real trades.
* Do not build complex gamification or social features.
* Do not overload views with dense dashboards.

## 8) Definition of done for each feature

A feature is done only if it includes:

* Clean UI aligned with the design rules.
* Validations and safe defaults.
* Drill-down explanation or calculation steps where numbers are shown.
* Data persistence and correct recomputation of dependent outputs.

## 9) Communication style inside the UI

* Neutral and precise labels.
* Use finance-appropriate language.
* Avoid exclamation points and hype.
* Always include units (DKK, percent, per month).

End of file.
