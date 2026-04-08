export {};

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PrismaClient, DebtKind, ImportStatus, TxType } = require("@prisma/client");
const { resetDatabase } = require("../prisma/seed");
const {
  importHoldingsCsv,
  importExpensesCsv,
  importTransactionsCsv,
  importSuDebtPostingsCsv,
} = require("../src/imports/service");

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = new PrismaClient();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wealth-import-"));

  const holdingsCsvPath = path.join(tempDir, "holdings_snapshot.csv");
  const expensesCsvPath = path.join(tempDir, "expenses.csv");
  const transactionsCsvPath = path.join(tempDir, "transactions.csv");
  const suDebtCsvPath = path.join(tempDir, "su_debt_postings.csv");

  const holdingsCsv = [
    "snapshot_date,account_name,name,symbol,isin_code,asset_type,qty,avg_price,cost_currency,instrument_currency,tax_bucket",
    "2026-02-08,Nordnet Depot,iShares Core MSCI World UCITS ETF,SWDA,IE00B4L5Y983,ETF,12.50,650.00,DKK,DKK,UNKNOWN",
    "2026-02-08,Nordnet Depot,Apple Inc,AAPL,US0378331005,STOCK,4.00,1450.00,DKK,,EQUITY_INCOME",
    "2026-02-08,Nordnet Depot,Bad Asset,BA,,CRYPTO,2.00,100.00,DKK,DKK,UNKNOWN",
  ].join("\n");

  const expensesCsv = [
    "category,name,value,currency,cadence,start_date,end_date",
    "Housing,Rent,9000,DKK,MONTHLY,2026-02-01,",
    "Food,Groceries,3000,,MONTHLY,2026-02-01,",
    "Insurance,Home insurance,2400,DKK,ANNUAL,2026-02-01,",
  ].join("\n");

  const transactionsCsv = [
    "trade_date,account,transaction_type,name,symbol,isin_code,qty,unit_price,commission,currency,cash_amount,origin",
    "2026-02-08,Nordnet Depot,BUY,iShares Core MSCI World UCITS ETF,SWDA,IE00B4L5Y983,1.00,650.00,0.00,DKK,,nordnet_import",
    "2026-02-15,Nordnet Depot,DIVIDEND,Apple Inc,AAPL,US0378331005,,,0.00,DKK,45.00,nordnet_import",
    "2026-02-16,Nordnet Depot,FEE,,,,,,0.00,DKK,29.00,nordnet_import",
    "2026-02-17,Nordnet Depot,ADJUSTMENT,,,,,,0.00,DKK,,nordnet_import",
    "2026-02-08,Nordnet Depot,BUY,iShares Core MSCI World UCITS ETF,SWDA,IE00B4L5Y983,1.00,650.00,0.00,DKK,,nordnet_import",
    "2026-02-18,Nordnet Depot,DIVIDEND,Apple Inc,AAPL,US0378331005,1.00,10.00,0.00,DKK,,nordnet_import",
  ].join("\n");

  const suDebtCsv = [
    "date,type,amount,currency,note",
    "2026-03-01,DISBURSEMENT,3799,DKK,Monthly SU loan",
    "2026-03-31,INTEREST,12.66,,Monthly accrual",
    "2026-04-15,INVALID,100,DKK,Invalid type",
    "2026-03-01,DISBURSEMENT,3799,DKK,Monthly SU loan",
  ].join("\n");

  fs.writeFileSync(holdingsCsvPath, holdingsCsv, "utf8");
  fs.writeFileSync(expensesCsvPath, expensesCsv, "utf8");
  fs.writeFileSync(transactionsCsvPath, transactionsCsv, "utf8");
  fs.writeFileSync(suDebtCsvPath, suDebtCsv, "utf8");

  try {
    await resetDatabase();
    const user = await prisma.user.create({ data: {} });

    const holdingsResult = await importHoldingsCsv(prisma, {
      userId: user.id,
      filePath: holdingsCsvPath,
    });
    const expensesResult = await importExpensesCsv(prisma, {
      userId: user.id,
      filePath: expensesCsvPath,
    });
    const transactionsResult = await importTransactionsCsv(prisma, {
      userId: user.id,
      filePath: transactionsCsvPath,
    });
    const suDebtResult = await importSuDebtPostingsCsv(prisma, {
      userId: user.id,
      filePath: suDebtCsvPath,
    });

    const snapshots = await prisma.holdingsSnapshot.findMany({
      where: { userId: user.id },
      include: { lines: true, account: true },
    });
    const expenseLines = await prisma.expenseLine.findMany({
      where: { userId: user.id },
      orderBy: { category: "asc" },
    });
    const importJobs = await prisma.importJob.findMany({
      where: { userId: user.id },
      orderBy: { importedAt: "asc" },
    });
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      include: { account: true, instrument: true },
      orderBy: { date: "asc" },
    });
    const transactionAmounts = (await prisma.$queryRawUnsafe(
      'SELECT "id", "amount" FROM "Transaction" WHERE "userId" = ?',
      user.id,
    )) as Array<{ id: string; amount: unknown }>;
    const amountById = new Map<string, string | null>(
      transactionAmounts.map((row) => [row.id, row.amount === null || row.amount === undefined ? null : String(row.amount)]),
    );
    const debtPostings = await prisma.debtPosting.findMany({
      include: { debtAccount: true },
      orderBy: { date: "asc" },
    });

    assertCondition(holdingsResult.status === ImportStatus.PARTIAL, "Holdings import should be PARTIAL.");
    assertCondition(holdingsResult.importedRows === 2, "Holdings import should import 2 rows.");
    assertCondition(holdingsResult.rejectedRows === 1, "Holdings import should reject 1 row.");

    assertCondition(expensesResult.status === ImportStatus.SUCCESS, "Expenses import should be SUCCESS.");
    assertCondition(expensesResult.importedRows === 3, "Expenses import should import 3 rows.");
    assertCondition(expensesResult.rejectedRows === 0, "Expenses import should reject 0 rows.");

    assertCondition(transactionsResult.status === ImportStatus.PARTIAL, "Transactions import should be PARTIAL.");
    assertCondition(transactionsResult.importedRows === 4, "Transactions import should import 4 rows.");
    assertCondition(transactionsResult.rejectedRows === 1, "Transactions import should reject 1 row.");

    assertCondition(suDebtResult.status === ImportStatus.PARTIAL, "SU debt import should be PARTIAL.");
    assertCondition(suDebtResult.importedRows === 2, "SU debt import should import 2 rows.");
    assertCondition(suDebtResult.rejectedRows === 1, "SU debt import should reject 1 row.");

    assertCondition(snapshots.length === 1, "Expected one holdings snapshot.");
    assertCondition(snapshots[0].lines.length === 2, "Expected two holdings snapshot lines.");
    assertCondition(expenseLines.length === 3, "Expected three expense lines.");
    assertCondition(importJobs.length === 4, "Expected four import jobs.");
    assertCondition(transactions.length === 4, "Expected four transaction rows.");
    assertCondition(debtPostings.length === 2, "Expected two debt postings from SU debt import.");
    assertCondition(
      debtPostings.every((posting: any) => posting.debtAccount && posting.debtAccount.kind === DebtKind.SU),
      "Expected every imported debt posting to reference an SU debt account.",
    );
    assertCondition(
      transactions.every((tx: any) => tx.account && tx.account.id),
      "Every transaction should reference an account.",
    );
    assertCondition(
      transactions
        .filter((tx: any) => [TxType.BUY, TxType.SELL, TxType.DIVIDEND].includes(tx.type))
        .every((tx: any) => tx.instrumentId && tx.instrument && tx.instrument.id),
      "Instrument-linked transaction types should reference an instrument.",
    );

    const feeWithoutInstrument = transactions.find((tx: any) => tx.type === TxType.FEE) as any;
    assertCondition(Boolean(feeWithoutInstrument), "Expected one FEE transaction.");
    assertCondition(
      !feeWithoutInstrument.instrumentId,
      "Expected FEE transaction to persist with instrumentId = null.",
    );
    assertCondition(
      amountById.get(feeWithoutInstrument.id) === "29",
      "Expected FEE transaction amount to be persisted as 29.",
    );

    console.log("Import verification summary:");
    console.log(
      JSON.stringify(
        {
          userId: user.id,
          holdingsResult,
          expensesResult,
          transactionsResult,
          suDebtResult,
          snapshots: snapshots.map((snapshot: any) => ({
            id: snapshot.id,
            asOfDate: snapshot.asOfDate.toISOString(),
            account: snapshot.account.name,
            lineCount: snapshot.lines.length,
          })),
          expenseLines: expenseLines.map((expense: any) => ({
            id: expense.id,
            category: expense.category,
            name: expense.name,
            amount: expense.amount.toString(),
            currency: expense.currency,
            frequency: expense.frequency,
          })),
          importJobs: importJobs.map((job: any) => ({
            id: job.id,
            kind: job.kind,
            status: job.status,
            sourceFile: job.sourceFile,
          })),
          transactions: transactions.map((tx: any) => ({
            id: tx.id,
            date: tx.date.toISOString(),
            type: tx.type,
            account: tx.account.name,
            instrument: tx.instrument ? tx.instrument.name : null,
            amount: amountById.get(tx.id) || null,
            quantity: tx.quantity ? tx.quantity.toString() : null,
            price: tx.price ? tx.price.toString() : null,
            fees: tx.fees ? tx.fees.toString() : null,
          })),
          debtPostings: debtPostings.map((posting: any) => ({
            id: posting.id,
            date: posting.date.toISOString(),
            type: posting.type,
            amount: posting.amount.toString(),
            currency: posting.currency,
            debtAccount: posting.debtAccount.name,
          })),
        },
        null,
        2,
      ),
    );
    console.log("Import verification passed.");
  } finally {
    await prisma.$disconnect();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error("Import verification failed:", error);
  process.exitCode = 1;
});
