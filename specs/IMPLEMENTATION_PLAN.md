# Implementation Plan

Personal Wealth Management Web App
Version 1.0

This plan defines the build sequence and non-negotiable implementation rules.
It is intentionally clinical and audit-first.

## 0) Global rules

- Event-first persistence: store raw events; compute derived views.
- Every displayed number must have an audit trail (expandable calculation steps).
- Scenarios are overrides, not duplicated datasets.
- Consistent UI patterns across modules: snapshot first, drill-down second.
- Prefer side panels and inline expansion; avoid heavy modals.

## 1) Data foundation (completed)

- Prisma schema + migrations
- Seed data
- Minimal verification script

## 2) Domain engines (no UI)

### 2.1 Holdings engine

- Input: `Transaction` events, optional `HoldingsSnapshot` for reconciliation.
- Output: computed positions per account and instrument (quantity, avg cost, realized/unrealized P&L).
- Audit: per instrument show calculation steps sourced from transaction ids.

### 2.2 Debt engine (SU)

- Input: `DebtPosting` events, optional `DebtPlan` as generator of planned postings.
- Output: month-by-month schedule (principal, interest accrual, repayments), running balance.
- Audit: show postings and the accrual formula used.

### 2.3 Tax baseline (MVP)

- Input: classified transactions/dividends/realized gains, instrument `taxBucket`.
- Output: simple breakdown by bucket with assumptions declared.
- Audit: show grouping logic and source events.

### 2.4 Cashflow baseline

- Input: `ExpenseLine` + cash transactions.
- Output: monthly cashflow snapshot and forward projection under scenario overrides.
- Audit: list included expense lines and assumptions.

## 3) Import pipeline (no UI first)

- CSV ingestion creates `ImportJob` and associated events.
- Mapping is stored in `ImportJob.mappingJson`.
- Row-level parse/validation issues are stored in `ImportJob.errorsJson`.
- Goal: reproducible imports and debuggable failures.

## 4) Minimal API layer (read/write)

- Provide a narrow, typed API for:
  - Create/update recurring plans and lines
  - Execute a plan run (paper execution) and write `ExecutionRun` + `Transaction`
  - Create debt postings and plan
  - Run derived computations (holdings/debt schedule/tax snapshot)
- Return audit steps alongside computed outputs.

## 5) UI build sequence (after engines)

### 5.1 Overview

- Net worth snapshot
- Cashflow snapshot
- Portfolio snapshot
- Tax snapshot
- Debt snapshot

### 5.2 Investments

- Holdings table (computed)
- CSV import UI (audit of mapping + errors)
- Recurring plan editor + paper execution

### 5.3 Debt

- SU month-by-month schedule
- Posting audit trail

### 5.4 Simulations

- Scenario drawer (overrides)
- 5/10/15 year outputs

## 6) Definition of done

A feature is done only if it includes:

- Validation and safe defaults
- Persistence and recomputation correctness
- Drill-down audit steps for every key number
- Stable schema and migration safety
