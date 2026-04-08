-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DKK',
    "institution" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isin" TEXT,
    "ticker" TEXT,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "currency" TEXT,
    "taxBucket" TEXT NOT NULL DEFAULT 'UNKNOWN'
);

-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instrumentId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "close" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "source" TEXT,
    CONSTRAINT "Price_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mappingJson" JSONB,
    "errorsJson" JSONB,
    CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrumentId" TEXT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL,
    "price" DECIMAL,
    "fees" DECIMAL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'DKK',
    "source" TEXT,
    "executionRunId" TEXT,
    "importJobId" TEXT,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_executionRunId_fkey" FOREIGN KEY ("executionRunId") REFERENCES "ExecutionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HoldingsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "asOfDate" DATETIME NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DKK',
    "importJobId" TEXT,
    CONSTRAINT "HoldingsSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HoldingsSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HoldingsSnapshot_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HoldingsSnapshotLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "avgCost" DECIMAL NOT NULL,
    "costCurrency" TEXT NOT NULL DEFAULT 'DKK',
    CONSTRAINT "HoldingsSnapshotLine_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "HoldingsSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HoldingsSnapshotLine_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringInvestmentPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT,
    "amountDkk" DECIMAL NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringInvestmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringInvestmentPlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringPlanLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "weightPct" DECIMAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RecurringPlanLine_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RecurringInvestmentPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringPlanLine_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "executedAt" DATETIME,
    "status" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "ExecutionRun_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RecurringInvestmentPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DKK',
    "frequency" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "importJobId" TEXT,
    CONSTRAINT "ExpenseLine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseLine_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DebtAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SU',
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DKK',
    "annualRate" DECIMAL NOT NULL,
    CONSTRAINT "DebtAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DebtPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "debtAccountId" TEXT NOT NULL,
    "startMonth" DATETIME NOT NULL,
    "endMonth" DATETIME NOT NULL,
    "amountPerMonth" DECIMAL NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "DebtPlan_debtAccountId_fkey" FOREIGN KEY ("debtAccountId") REFERENCES "DebtAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DebtPosting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "debtAccountId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DKK',
    "note" TEXT,
    "importJobId" TEXT,
    CONSTRAINT "DebtPosting_debtAccountId_fkey" FOREIGN KEY ("debtAccountId") REFERENCES "DebtAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DebtPosting_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScenarioOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    CONSTRAINT "ScenarioOverride_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Instrument_isin_key" ON "Instrument"("isin");

-- CreateIndex
CREATE INDEX "Price_instrumentId_date_idx" ON "Price"("instrumentId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "Transaction_instrumentId_date_idx" ON "Transaction"("instrumentId", "date");

-- CreateIndex
CREATE INDEX "HoldingsSnapshot_userId_asOfDate_idx" ON "HoldingsSnapshot"("userId", "asOfDate");

-- CreateIndex
CREATE INDEX "HoldingsSnapshotLine_snapshotId_idx" ON "HoldingsSnapshotLine"("snapshotId");

-- CreateIndex
CREATE INDEX "RecurringInvestmentPlan_userId_status_idx" ON "RecurringInvestmentPlan"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPlanLine_planId_instrumentId_key" ON "RecurringPlanLine"("planId", "instrumentId");

-- CreateIndex
CREATE INDEX "ExecutionRun_planId_scheduledDate_idx" ON "ExecutionRun"("planId", "scheduledDate");

-- CreateIndex
CREATE INDEX "ExpenseLine_userId_category_idx" ON "ExpenseLine"("userId", "category");

-- CreateIndex
CREATE INDEX "DebtAccount_userId_kind_idx" ON "DebtAccount"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "DebtPlan_debtAccountId_key" ON "DebtPlan"("debtAccountId");

-- CreateIndex
CREATE INDEX "DebtPosting_debtAccountId_date_idx" ON "DebtPosting"("debtAccountId", "date");

-- CreateIndex
CREATE INDEX "ScenarioOverride_scenarioId_idx" ON "ScenarioOverride"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioOverride_scenarioId_key_key" ON "ScenarioOverride"("scenarioId", "key");
