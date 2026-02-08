import {
  AccountType,
  DebtPostingType,
  PlanStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { calculateTax } from "../lib/tax";
import type { TaxInput, TaxOutput } from "../lib/tax";

export interface BackendAuditStep {
  label: string;
  formula: string;
  value: string;
  unit: string;
}

export interface BackendAudit {
  title: string;
  context: Record<string, string>;
  steps: BackendAuditStep[];
  notes: string[];
}

export interface RecurringPlanLineInput {
  instrumentId: string;
  weightPct: number;
  sortOrder?: number;
}

export interface CreateRecurringPlanInput {
  userId: string;
  accountId: string;
  amountDkk: number;
  dayOfMonth: number;
  name?: string;
  status?: PlanStatus;
  lines: RecurringPlanLineInput[];
}

export interface UpdateRecurringPlanInput {
  planId: string;
  amountDkk?: number;
  dayOfMonth?: number;
  name?: string | null;
  status?: PlanStatus;
  lines?: RecurringPlanLineInput[];
}

export interface DebtPlanInput {
  debtAccountId: string;
  startMonth: Date;
  endMonth: Date;
  amountPerMonth: number;
  dayOfMonth: number;
  status?: PlanStatus;
}

export interface DebtPostingInput {
  debtAccountId: string;
  date: Date;
  type: DebtPostingType;
  amount: number;
  currency?: string;
  note?: string;
  importJobId?: string;
}

export interface HoldingsPosition {
  accountId: string;
  accountName: string;
  instrumentId: string;
  instrumentName: string;
  ticker: string | null;
  isin: string | null;
  quantity: string;
  avgCost: string;
  costCurrency: string;
  realizedPnl: string;
}

export interface HoldingsComputationResult {
  asOfDate: string;
  baselineSnapshotId: string | null;
  positions: HoldingsPosition[];
  warnings: string[];
  audits: BackendAudit[];
}

export interface DebtMonthRow {
  month: string;
  openingBalance: string;
  disbursement: string;
  interest: string;
  repayment: string;
  adjustment: string;
  closingBalance: string;
}

export interface DebtScheduleResult {
  debtAccountId: string;
  debtAccountName: string;
  currency: string;
  annualRate: string;
  rows: DebtMonthRow[];
  audits: BackendAudit[];
}

function dec(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function asMoney(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function asQuantity(value: Prisma.Decimal): string {
  return value.toFixed(6);
}

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthStartFromKey(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

function nextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function monthKeysInclusive(start: string, end: string): string[] {
  const keys: string[] = [];
  let cursor = monthStartFromKey(start);
  const endMonth = monthStartFromKey(end);
  while (cursor.getTime() <= endMonth.getTime()) {
    keys.push(monthKey(cursor));
    cursor = nextMonth(cursor);
  }
  return keys;
}

function assertPlanInput(amountDkk: number, dayOfMonth: number, lines: RecurringPlanLineInput[]): void {
  if (!Number.isFinite(amountDkk) || amountDkk <= 0) {
    throw new Error("amountDkk must be greater than 0.");
  }
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    throw new Error("dayOfMonth must be an integer between 1 and 31.");
  }
  if (!lines.length) {
    throw new Error("Recurring plan requires at least one line.");
  }
  const totalWeight = lines.reduce((sum, line) => sum + line.weightPct, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`Recurring plan line weights must sum to 100. Current: ${totalWeight}.`);
  }
}

export async function createRecurringPlan(
  prisma: PrismaClient,
  input: CreateRecurringPlanInput,
) {
  assertPlanInput(input.amountDkk, input.dayOfMonth, input.lines);

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: input.accountId },
      select: { id: true, userId: true, type: true },
    });
    if (!account || account.userId !== input.userId) {
      throw new Error("Account not found for user.");
    }
    if (account.type !== AccountType.BROKERAGE) {
      throw new Error("Recurring investment plans require a BROKERAGE account.");
    }

    const plan = await tx.recurringInvestmentPlan.create({
      data: {
        userId: input.userId,
        accountId: input.accountId,
        amountDkk: dec(input.amountDkk),
        dayOfMonth: input.dayOfMonth,
        name: input.name,
        status: input.status ?? PlanStatus.ACTIVE,
      },
    });

    await tx.recurringPlanLine.createMany({
      data: input.lines.map((line, index) => ({
        planId: plan.id,
        instrumentId: line.instrumentId,
        weightPct: dec(line.weightPct),
        sortOrder: line.sortOrder ?? index,
      })),
    });

    return tx.recurringInvestmentPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: {
        lines: {
          include: { instrument: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });
}

export async function updateRecurringPlan(
  prisma: PrismaClient,
  input: UpdateRecurringPlanInput,
) {
  const current = await prisma.recurringInvestmentPlan.findUnique({
    where: { id: input.planId },
    include: { lines: true },
  });
  if (!current) {
    throw new Error(`Plan ${input.planId} not found.`);
  }

  const nextLines = input.lines ?? current.lines.map((line) => ({
    instrumentId: line.instrumentId,
    weightPct: Number(line.weightPct),
    sortOrder: line.sortOrder,
  }));
  assertPlanInput(
    input.amountDkk ?? Number(current.amountDkk),
    input.dayOfMonth ?? current.dayOfMonth,
    nextLines,
  );

  return prisma.$transaction(async (tx) => {
    await tx.recurringInvestmentPlan.update({
      where: { id: input.planId },
      data: {
        amountDkk: input.amountDkk !== undefined ? dec(input.amountDkk) : undefined,
        dayOfMonth: input.dayOfMonth,
        name: input.name,
        status: input.status,
      },
    });

    if (input.lines) {
      await tx.recurringPlanLine.deleteMany({ where: { planId: input.planId } });
      await tx.recurringPlanLine.createMany({
        data: input.lines.map((line, index) => ({
          planId: input.planId,
          instrumentId: line.instrumentId,
          weightPct: dec(line.weightPct),
          sortOrder: line.sortOrder ?? index,
        })),
      });
    }

    return tx.recurringInvestmentPlan.findUniqueOrThrow({
      where: { id: input.planId },
      include: {
        lines: {
          include: { instrument: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });
}

export async function executeRecurringPlanRun(input: {
  planId: string;
  targetMonth: string;
  force?: boolean;
}) {
  const { executeShadowMonthlySavings } = await import("../monthlySavings");
  return executeShadowMonthlySavings(input);
}

export async function setRecurringPlanManualExecutionPrice(input: {
  executionLineId: string;
  manualPrice: number;
  note?: string;
}) {
  const { setManualExecutionPrice } = await import("../monthlySavings");
  return setManualExecutionPrice(input);
}

export async function upsertDebtPlan(
  prisma: PrismaClient,
  input: DebtPlanInput,
) {
  if (input.amountPerMonth < 0) {
    throw new Error("amountPerMonth must be 0 or greater.");
  }
  if (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth < 1 || input.dayOfMonth > 31) {
    throw new Error("dayOfMonth must be an integer between 1 and 31.");
  }
  if (input.endMonth.getTime() < input.startMonth.getTime()) {
    throw new Error("endMonth must be greater than or equal to startMonth.");
  }

  return prisma.debtPlan.upsert({
    where: { debtAccountId: input.debtAccountId },
    update: {
      startMonth: input.startMonth,
      endMonth: input.endMonth,
      amountPerMonth: dec(input.amountPerMonth),
      dayOfMonth: input.dayOfMonth,
      status: input.status ?? PlanStatus.ACTIVE,
    },
    create: {
      debtAccountId: input.debtAccountId,
      startMonth: input.startMonth,
      endMonth: input.endMonth,
      amountPerMonth: dec(input.amountPerMonth),
      dayOfMonth: input.dayOfMonth,
      status: input.status ?? PlanStatus.ACTIVE,
    },
  });
}

export async function createDebtPosting(
  prisma: PrismaClient,
  input: DebtPostingInput,
) {
  return prisma.debtPosting.create({
    data: {
      debtAccountId: input.debtAccountId,
      date: input.date,
      type: input.type,
      amount: dec(input.amount),
      currency: input.currency ?? "DKK",
      note: input.note,
      importJobId: input.importJobId,
    },
  });
}

interface PositionState {
  accountId: string;
  accountName: string;
  instrumentId: string;
  instrumentName: string;
  ticker: string | null;
  isin: string | null;
  quantity: Prisma.Decimal;
  avgCost: Prisma.Decimal;
  costCurrency: string;
  realizedPnl: Prisma.Decimal;
}

export async function computeHoldingsFromEvents(
  prisma: PrismaClient,
  args: { userId: string; asOfDate?: Date },
): Promise<HoldingsComputationResult> {
  const asOfDate = args.asOfDate ?? new Date();
  const warnings: string[] = [];
  const audits: BackendAudit[] = [];

  const baseline = await prisma.holdingsSnapshot.findFirst({
    where: {
      userId: args.userId,
      asOfDate: { lte: asOfDate },
    },
    include: {
      account: true,
      lines: {
        include: { instrument: true },
      },
    },
    orderBy: { asOfDate: "desc" },
  });

  const txs = await prisma.transaction.findMany({
    where: {
      userId: args.userId,
      date: {
        lte: asOfDate,
        gt: baseline?.asOfDate,
      },
    },
    include: {
      account: true,
      instrument: true,
    },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  const states = new Map<string, PositionState>();

  if (baseline) {
    for (const line of baseline.lines) {
      const key = `${baseline.accountId}:${line.instrumentId}`;
      states.set(key, {
        accountId: baseline.accountId,
        accountName: baseline.account.name,
        instrumentId: line.instrumentId,
        instrumentName: line.instrument.name,
        ticker: line.instrument.ticker,
        isin: line.instrument.isin,
        quantity: dec(line.quantity),
        avgCost: dec(line.avgCost),
        costCurrency: line.costCurrency,
        realizedPnl: dec(0),
      });
    }
  }

  for (const tx of txs) {
    if (!tx.instrumentId || !tx.instrument) {
      continue;
    }

    const key = `${tx.accountId}:${tx.instrumentId}`;
    const state = states.get(key) ?? {
      accountId: tx.accountId,
      accountName: tx.account.name,
      instrumentId: tx.instrumentId,
      instrumentName: tx.instrument.name,
      ticker: tx.instrument.ticker,
      isin: tx.instrument.isin,
      quantity: dec(0),
      avgCost: dec(0),
      costCurrency: tx.currency,
      realizedPnl: dec(0),
    };

    if (tx.type === "BUY") {
      if (!tx.quantity || !tx.price) {
        warnings.push(`BUY ${tx.id} skipped: missing quantity or price.`);
        continue;
      }
      const buyQty = dec(tx.quantity);
      const price = dec(tx.price);
      const fees = dec(tx.fees ?? 0);
      const buyValue = buyQty.mul(price).add(fees);
      const oldCost = state.quantity.mul(state.avgCost);
      const newQty = state.quantity.add(buyQty);
      const newAvgCost = newQty.gt(0) ? oldCost.add(buyValue).div(newQty) : dec(0);

      audits.push({
        title: `BUY ${tx.instrument.name}`,
        context: {
          transactionId: tx.id,
          date: tx.date.toISOString(),
        },
        steps: [
          {
            label: "buyValue",
            formula: `${buyQty.toString()} * ${price.toString()} + ${fees.toString()}`,
            value: buyValue.toString(),
            unit: tx.currency,
          },
          {
            label: "avgCostNew",
            formula: `(qtyOld * avgCostOld + buyValue) / qtyNew`,
            value: newAvgCost.toString(),
            unit: tx.currency,
          },
        ],
        notes: [],
      });

      state.quantity = newQty;
      state.avgCost = newAvgCost;
      state.costCurrency = tx.currency;
      states.set(key, state);
      continue;
    }

    if (tx.type === "SELL") {
      if (!tx.quantity || !tx.price) {
        warnings.push(`SELL ${tx.id} skipped: missing quantity or price.`);
        continue;
      }
      const sellQty = dec(tx.quantity);
      const price = dec(tx.price);
      const fees = dec(tx.fees ?? 0);
      if (sellQty.gt(state.quantity)) {
        warnings.push(
          `SELL ${tx.id} skipped: quantity ${sellQty.toString()} exceeds position ${state.quantity.toString()}.`,
        );
        continue;
      }

      const sellValue = sellQty.mul(price).sub(fees);
      const costRemoved = sellQty.mul(state.avgCost);
      const realized = sellValue.sub(costRemoved);
      const newQty = state.quantity.sub(sellQty);

      audits.push({
        title: `SELL ${tx.instrument.name}`,
        context: {
          transactionId: tx.id,
          date: tx.date.toISOString(),
        },
        steps: [
          {
            label: "sellValue",
            formula: `${sellQty.toString()} * ${price.toString()} - ${fees.toString()}`,
            value: sellValue.toString(),
            unit: tx.currency,
          },
          {
            label: "realizedPnlDelta",
            formula: `sellValue - (qtySell * avgCostOld)`,
            value: realized.toString(),
            unit: tx.currency,
          },
        ],
        notes: [],
      });

      state.realizedPnl = state.realizedPnl.add(realized);
      state.quantity = newQty;
      if (newQty.eq(0)) {
        state.avgCost = dec(0);
      }
      states.set(key, state);
    }
  }

  const positions = Array.from(states.values())
    .filter((state) => state.quantity.gt(0))
    .map((state) => ({
      accountId: state.accountId,
      accountName: state.accountName,
      instrumentId: state.instrumentId,
      instrumentName: state.instrumentName,
      ticker: state.ticker,
      isin: state.isin,
      quantity: asQuantity(state.quantity),
      avgCost: asMoney(state.avgCost),
      costCurrency: state.costCurrency,
      realizedPnl: asMoney(state.realizedPnl),
    }))
    .sort((a, b) => {
      if (a.accountName === b.accountName) {
        return a.instrumentName.localeCompare(b.instrumentName);
      }
      return a.accountName.localeCompare(b.accountName);
    });

  return {
    asOfDate: asOfDate.toISOString(),
    baselineSnapshotId: baseline?.id ?? null,
    positions,
    warnings,
    audits,
  };
}

export async function computeDebtScheduleFromPostings(
  prisma: PrismaClient,
  args: { userId: string; debtAccountId?: string; startMonth?: string; endMonth?: string },
): Promise<DebtScheduleResult[]> {
  const accounts = await prisma.debtAccount.findMany({
    where: {
      userId: args.userId,
      id: args.debtAccountId,
    },
    include: {
      postings: {
        orderBy: [{ date: "asc" }, { id: "asc" }],
      },
    },
  });

  return accounts.map((account) => {
    if (!account.postings.length) {
      return {
        debtAccountId: account.id,
        debtAccountName: account.name,
        currency: account.currency,
        annualRate: account.annualRate.toString(),
        rows: [],
        audits: [],
      };
    }

    const firstMonth = args.startMonth ?? monthKey(account.postings[0].date);
    const lastMonth = args.endMonth ?? monthKey(account.postings[account.postings.length - 1].date);
    const months = monthKeysInclusive(firstMonth, lastMonth);

    const byMonth = new Map<string, typeof account.postings>();
    for (const posting of account.postings) {
      const key = monthKey(posting.date);
      const existing = byMonth.get(key) ?? [];
      existing.push(posting);
      byMonth.set(key, existing);
    }

    const openingBeforeStart = account.postings
      .filter((posting) => monthKey(posting.date) < firstMonth)
      .reduce((sum, posting) => sum.add(posting.amount), dec(0));

    let runningOpening = openingBeforeStart;
    const rows: DebtMonthRow[] = [];
    const audits: BackendAudit[] = [];

    for (const month of months) {
      const monthPostings = byMonth.get(month) ?? [];
      const disbursement = monthPostings
        .filter((posting) => posting.type === DebtPostingType.DISBURSEMENT)
        .reduce((sum, posting) => sum.add(posting.amount), dec(0));
      const interest = monthPostings
        .filter((posting) => posting.type === DebtPostingType.INTEREST)
        .reduce((sum, posting) => sum.add(posting.amount), dec(0));
      const repayment = monthPostings
        .filter((posting) => posting.type === DebtPostingType.REPAYMENT)
        .reduce((sum, posting) => sum.add(posting.amount), dec(0));
      const adjustment = monthPostings
        .filter((posting) => posting.type === DebtPostingType.ADJUSTMENT)
        .reduce((sum, posting) => sum.add(posting.amount), dec(0));

      const closing = runningOpening.add(disbursement).add(interest).add(repayment).add(adjustment);

      rows.push({
        month,
        openingBalance: asMoney(runningOpening),
        disbursement: asMoney(disbursement),
        interest: asMoney(interest),
        repayment: asMoney(repayment),
        adjustment: asMoney(adjustment),
        closingBalance: asMoney(closing),
      });

      audits.push({
        title: `Debt month ${month}`,
        context: { debtAccountId: account.id, month },
        steps: [
          {
            label: "closingBalance",
            formula: `opening + disbursement + interest + repayment + adjustment`,
            value: closing.toString(),
            unit: account.currency,
          },
        ],
        notes: [],
      });

      runningOpening = closing;
    }

    return {
      debtAccountId: account.id,
      debtAccountName: account.name,
      currency: account.currency,
      annualRate: account.annualRate.toString(),
      rows,
      audits,
    };
  });
}

export function computeTaxSnapshot(input: TaxInput): TaxOutput {
  return calculateTax(input);
}
