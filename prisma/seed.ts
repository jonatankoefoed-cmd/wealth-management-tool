export {};

const {
  Prisma,
  PrismaClient,
  AccountType,
  AssetType,
  TaxBucket,
  TxType,
  PlanStatus,
  RunStatus,
  DebtKind,
  DebtPostingType,
  ImportKind,
  ImportStatus,
} = require('@prisma/client');

const prisma = new PrismaClient();

const dec = (value: string | number) => new Prisma.Decimal(value);

async function resetDatabase() {
  await prisma.scenarioOverride.deleteMany();
  await prisma.scenario.deleteMany();

  await prisma.debtPosting.deleteMany();
  await prisma.debtPlan.deleteMany();
  await prisma.debtAccount.deleteMany();

  await prisma.expenseLine.deleteMany();

  await prisma.transaction.deleteMany();
  await prisma.executionRun.deleteMany();
  await prisma.recurringPlanLine.deleteMany();
  await prisma.recurringInvestmentPlan.deleteMany();

  await prisma.holdingsSnapshotLine.deleteMany();
  await prisma.holdingsSnapshot.deleteMany();

  await prisma.price.deleteMany();
  await prisma.instrument.deleteMany();

  await prisma.importJob.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function seedDatabase() {
  await resetDatabase();

  const user = await prisma.user.create({
    data: {},
  });

  const [cashAccount, brokerageAccount, debtLedgerAccount] = await Promise.all([
    prisma.account.create({
      data: {
        userId: user.id,
        type: AccountType.CASH,
        name: 'Main Cash Account',
        currency: 'DKK',
        institution: 'Nordea',
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        type: AccountType.BROKERAGE,
        name: 'Nordnet Brokerage',
        currency: 'DKK',
        institution: 'Nordnet',
      },
    }),
    prisma.account.create({
      data: {
        userId: user.id,
        type: AccountType.DEBT,
        name: 'SU Debt Ledger',
        currency: 'DKK',
        institution: 'SU',
      },
    }),
  ]);

  const [worldEtf, nordiskStock] = await Promise.all([
    prisma.instrument.create({
      data: {
        isin: 'IE00B4L5Y983',
        ticker: 'EUNL',
        name: 'iShares Core MSCI World UCITS ETF',
        assetType: AssetType.ETF,
        currency: 'DKK',
        taxBucket: TaxBucket.CAPITAL_INCOME,
      },
    }),
    prisma.instrument.create({
      data: {
        isin: 'DK0062498333',
        ticker: 'NOVO-B',
        name: 'Novo Nordisk A/S',
        assetType: AssetType.STOCK,
        currency: 'DKK',
        taxBucket: TaxBucket.EQUITY_INCOME,
      },
    }),
  ]);

  await prisma.price.createMany({
    data: [
      {
        instrumentId: worldEtf.id,
        date: new Date('2026-02-06T00:00:00.000Z'),
        close: dec(1098.25),
        currency: 'DKK',
        source: 'seed',
      },
      {
        instrumentId: nordiskStock.id,
        date: new Date('2026-02-06T00:00:00.000Z'),
        close: dec(742.5),
        currency: 'DKK',
        source: 'seed',
      },
    ],
  });

  const [holdingsImportJob, txImportJob, expensesImportJob] = await Promise.all([
    prisma.importJob.create({
      data: {
        userId: user.id,
        kind: ImportKind.HOLDINGS_CSV,
        status: ImportStatus.SUCCESS,
        sourceFile: 'seed/holdings.csv',
        mappingJson: {
          instrument: 'isin',
          quantity: 'quantity',
          avgCost: 'avgCost',
        },
      },
    }),
    prisma.importJob.create({
      data: {
        userId: user.id,
        kind: ImportKind.TRANSACTIONS_CSV,
        status: ImportStatus.PARTIAL,
        sourceFile: 'seed/transactions.csv',
        errorsJson: [{ row: 5, reason: 'Missing fee currency; defaulted to DKK' }],
      },
    }),
    prisma.importJob.create({
      data: {
        userId: user.id,
        kind: ImportKind.EXPENSES_CSV,
        status: ImportStatus.SUCCESS,
        sourceFile: 'seed/expenses.csv',
      },
    }),
  ]);

  const recurringPlan = await prisma.recurringInvestmentPlan.create({
    data: {
      userId: user.id,
      accountId: brokerageAccount.id,
      name: 'Monthly Core Allocation',
      amountDkk: dec(8000),
      dayOfMonth: 5,
      status: PlanStatus.ACTIVE,
      lines: {
        create: [
          {
            instrumentId: worldEtf.id,
            weightPct: dec(70),
            sortOrder: 1,
          },
          {
            instrumentId: nordiskStock.id,
            weightPct: dec(30),
            sortOrder: 2,
          },
        ],
      },
      runs: {
        create: {
          scheduledDate: new Date('2026-02-05T00:00:00.000Z'),
          executedAt: new Date('2026-02-05T08:05:00.000Z'),
          status: RunStatus.SUCCESS,
          note: 'Paper execution based on recurring plan weights',
        },
      },
    },
    include: {
      runs: true,
    },
  });

  const executionRunId = recurringPlan.runs[0].id;

  await prisma.transaction.createMany({
    data: [
      {
        userId: user.id,
        accountId: brokerageAccount.id,
        instrumentId: worldEtf.id,
        date: new Date('2026-02-05T08:05:00.000Z'),
        type: TxType.BUY,
        quantity: dec(5.095),
        price: dec(1098.25),
        fees: dec(15),
        currency: 'DKK',
        source: 'plan_execution',
        executionRunId,
        importJobId: txImportJob.id,
      },
      {
        userId: user.id,
        accountId: brokerageAccount.id,
        instrumentId: nordiskStock.id,
        date: new Date('2026-02-05T08:06:00.000Z'),
        type: TxType.BUY,
        quantity: dec(3.215),
        price: dec(742.5),
        fees: dec(10),
        currency: 'DKK',
        source: 'plan_execution',
        executionRunId,
        importJobId: txImportJob.id,
      },
      {
        userId: user.id,
        accountId: cashAccount.id,
        instrumentId: null,
        date: new Date('2026-02-01T00:00:00.000Z'),
        type: TxType.ADJUSTMENT,
        quantity: dec(1),
        price: dec(25000),
        fees: dec(0),
        currency: 'DKK',
        source: 'opening_balance',
      },
      {
        userId: user.id,
        accountId: debtLedgerAccount.id,
        instrumentId: null,
        date: new Date('2026-02-01T00:00:00.000Z'),
        type: TxType.ADJUSTMENT,
        quantity: dec(1),
        price: dec(-86500),
        fees: dec(0),
        currency: 'DKK',
        source: 'liability_sync',
      },
      {
        userId: user.id,
        accountId: brokerageAccount.id,
        instrumentId: nordiskStock.id,
        date: new Date('2026-02-28T00:00:00.000Z'),
        type: TxType.DIVIDEND,
        quantity: dec(3.215),
        price: dec(4.15),
        fees: dec(0),
        currency: 'DKK',
        source: 'issuer_distribution',
      },
    ],
  });

  await prisma.holdingsSnapshot.create({
    data: {
      userId: user.id,
      accountId: brokerageAccount.id,
      asOfDate: new Date('2026-02-06T00:00:00.000Z'),
      currency: 'DKK',
      importJobId: holdingsImportJob.id,
      lines: {
        create: [
          {
            instrumentId: worldEtf.id,
            quantity: dec(5.095),
            avgCost: dec(1101.194),
            costCurrency: 'DKK',
          },
          {
            instrumentId: nordiskStock.id,
            quantity: dec(3.215),
            avgCost: dec(745.61),
            costCurrency: 'DKK',
          },
        ],
      },
    },
  });

  await prisma.expenseLine.createMany({
    data: [
      {
        userId: user.id,
        category: 'Housing',
        name: 'Rent',
        amount: dec(8900),
        currency: 'DKK',
        frequency: 'MONTHLY',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        importJobId: expensesImportJob.id,
      },
      {
        userId: user.id,
        category: 'Insurance',
        name: 'Health Insurance',
        amount: dec(410),
        currency: 'DKK',
        frequency: 'MONTHLY',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        importJobId: expensesImportJob.id,
      },
    ],
  });

  const debtAccount = await prisma.debtAccount.create({
    data: {
      userId: user.id,
      kind: DebtKind.SU,
      name: 'SU Loan',
      currency: 'DKK',
      annualRate: dec(0.04),
      plan: {
        create: {
          startMonth: new Date('2026-02-01T00:00:00.000Z'),
          endMonth: new Date('2026-07-01T00:00:00.000Z'),
          amountPerMonth: dec(3200),
          dayOfMonth: 1,
          status: PlanStatus.ACTIVE,
        },
      },
    },
  });

  await prisma.debtPosting.createMany({
    data: [
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-02-01T00:00:00.000Z'),
        type: DebtPostingType.DISBURSEMENT,
        amount: dec(3200),
        currency: 'DKK',
        note: 'Monthly SU borrowing',
      },
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-02-28T00:00:00.000Z'),
        type: DebtPostingType.INTEREST,
        amount: dec(278.25),
        currency: 'DKK',
        note: 'Monthly accrued interest',
      },
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-03-01T00:00:00.000Z'),
        type: DebtPostingType.DISBURSEMENT,
        amount: dec(3200),
        currency: 'DKK',
        note: 'Monthly SU borrowing',
      },
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-03-31T00:00:00.000Z'),
        type: DebtPostingType.INTEREST,
        amount: dec(292.1),
        currency: 'DKK',
        note: 'Monthly accrued interest',
      },
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-04-01T00:00:00.000Z'),
        type: DebtPostingType.DISBURSEMENT,
        amount: dec(3200),
        currency: 'DKK',
        note: 'Monthly SU borrowing',
      },
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-05-01T00:00:00.000Z'),
        type: DebtPostingType.DISBURSEMENT,
        amount: dec(3200),
        currency: 'DKK',
        note: 'Monthly SU borrowing',
      },
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-06-01T00:00:00.000Z'),
        type: DebtPostingType.DISBURSEMENT,
        amount: dec(3200),
        currency: 'DKK',
        note: 'Monthly SU borrowing',
      },
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-07-01T00:00:00.000Z'),
        type: DebtPostingType.DISBURSEMENT,
        amount: dec(3200),
        currency: 'DKK',
        note: 'Final planned borrowing until 1 July',
      },
      {
        debtAccountId: debtAccount.id,
        date: new Date('2026-08-01T00:00:00.000Z'),
        type: DebtPostingType.REPAYMENT,
        amount: dec(-1500),
        currency: 'DKK',
        note: 'Sample repayment event',
      },
    ],
  });

  const baseScenario = await prisma.scenario.create({
    data: {
      userId: user.id,
      name: 'Base Scenario',
      isBase: true,
      overrides: {
        create: [
          {
            key: 'salary_growth_path',
            valueJson: {
              model: 'high_growth',
              yearlyPct: [7, 6, 5, 4],
            },
          },
          {
            key: 'return_assumptions',
            valueJson: {
              equityPct: 0.07,
              bondPct: 0.03,
            },
          },
        ],
      },
    },
  });

  return {
    userId: user.id,
    accountIds: [cashAccount.id, brokerageAccount.id, debtLedgerAccount.id],
    recurringPlanId: recurringPlan.id,
    debtAccountId: debtAccount.id,
    scenarioId: baseScenario.id,
  };
}

async function main() {
  const seeded = await seedDatabase();
  console.log('Seed completed.');
  console.log(JSON.stringify(seeded, null, 2));
}

if (require.main === module) {
  main()
    .catch((error: unknown) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = {
  seedDatabase,
  resetDatabase,
};
