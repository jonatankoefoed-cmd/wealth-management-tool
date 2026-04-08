export {};

const { PrismaClient, Prisma } = require('@prisma/client');
const { seedDatabase } = require('../prisma/seed');

const prisma = new PrismaClient();

const expectedIndexes = [
  'Price_instrumentId_date_idx',
  'Transaction_userId_date_idx',
  'Transaction_accountId_date_idx',
  'Transaction_instrumentId_date_idx',
  'HoldingsSnapshot_userId_asOfDate_idx',
  'RecurringInvestmentPlan_userId_status_idx',
  'DebtPosting_debtAccountId_date_idx',
  'ScenarioOverride_scenarioId_key_key',
];

function toDisplay(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === 'object') {
    if (value instanceof Prisma.Decimal) {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.map((item) => toDisplay(item));
    }
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = toDisplay(nested);
    }
    return output;
  }
  return value;
}

async function verify() {
  const seeded = await seedDatabase();

  const plans = await prisma.recurringInvestmentPlan.findMany({
    include: {
      account: true,
      lines: {
        include: {
          instrument: true,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (plans.length === 0) {
    throw new Error('Verification failed: no recurring plans found.');
  }

  for (const plan of plans) {
    const totalWeight = plan.lines.reduce(
      (sum: typeof plan.lines[number]['weightPct'], line: typeof plan.lines[number]) => sum.plus(line.weightPct),
      new Prisma.Decimal(0),
    );

    if (!totalWeight.equals(new Prisma.Decimal(100))) {
      throw new Error(`Verification failed: plan ${plan.id} weights do not sum to 100.`);
    }
  }

  const debtPostings = await prisma.debtPosting.findMany({
    include: {
      debtAccount: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  if (debtPostings.length === 0) {
    throw new Error('Verification failed: no debt postings found.');
  }

  if (debtPostings.some((posting: typeof debtPostings[number]) => !posting.debtAccount)) {
    throw new Error('Verification failed: debt posting missing related debt account.');
  }

  const lastSnapshot = await prisma.holdingsSnapshot.findFirst({
    include: {
      account: true,
      lines: {
        include: {
          instrument: true,
        },
      },
    },
    orderBy: {
      asOfDate: 'desc',
    },
  });

  if (!lastSnapshot) {
    throw new Error('Verification failed: no holdings snapshot found.');
  }

  if (lastSnapshot.lines.length === 0) {
    throw new Error('Verification failed: latest holdings snapshot has no lines.');
  }

  if (lastSnapshot.lines.some((line: typeof lastSnapshot.lines[number]) => !line.instrument)) {
    throw new Error('Verification failed: snapshot line missing related instrument.');
  }

  const sqliteIndexes = (await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'index'",
  )) as Array<{ name: string }>;

  const indexNames = new Set(sqliteIndexes.map((row) => row.name));
  const missingIndexes = expectedIndexes.filter((name) => !indexNames.has(name));

  if (missingIndexes.length > 0) {
    throw new Error(`Verification failed: missing expected indexes: ${missingIndexes.join(', ')}`);
  }

  const planOutput = plans.map((plan: typeof plans[number]) => ({
    planId: plan.id,
    name: plan.name,
    status: plan.status,
    amountDkk: plan.amountDkk,
    dayOfMonth: plan.dayOfMonth,
    account: {
      id: plan.account.id,
      name: plan.account.name,
      type: plan.account.type,
    },
    lines: plan.lines.map((line: typeof plan.lines[number]) => ({
      lineId: line.id,
      instrument: line.instrument.name,
      ticker: line.instrument.ticker,
      weightPct: line.weightPct,
      sortOrder: line.sortOrder,
    })),
  }));

  const debtOutput = debtPostings.map((posting: typeof debtPostings[number]) => ({
    postingId: posting.id,
    date: posting.date,
    type: posting.type,
    amount: posting.amount,
    debtAccount: posting.debtAccount.name,
  }));

  const snapshotOutput = {
    snapshotId: lastSnapshot.id,
    asOfDate: lastSnapshot.asOfDate,
    account: lastSnapshot.account.name,
    lines: lastSnapshot.lines.map((line: typeof lastSnapshot.lines[number]) => ({
      lineId: line.id,
      instrument: line.instrument.name,
      quantity: line.quantity,
      avgCost: line.avgCost,
      costCurrency: line.costCurrency,
    })),
  };

  console.log('Seeded entity IDs:');
  console.log(JSON.stringify(toDisplay(seeded), null, 2));

  console.log('\nPlans with lines:');
  console.log(JSON.stringify(toDisplay(planOutput), null, 2));

  console.log('\nDebt postings ordered by date:');
  console.log(JSON.stringify(toDisplay(debtOutput), null, 2));

  console.log('\nLatest holdings snapshot lines:');
  console.log(JSON.stringify(toDisplay(snapshotOutput), null, 2));

  console.log('\nIndex check:');
  console.log(
    JSON.stringify(
      {
        expected: expectedIndexes,
        found: expectedIndexes.filter((name) => indexNames.has(name)),
      },
      null,
      2,
    ),
  );

  console.log('\nVerification passed.');
}

verify()
  .catch((error: unknown) => {
    console.error('Verification failed with error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
