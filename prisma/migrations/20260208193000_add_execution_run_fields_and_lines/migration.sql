-- AlterTable
ALTER TABLE "ExecutionRun" ADD COLUMN "targetMonth" TEXT;
ALTER TABLE "ExecutionRun" ADD COLUMN "totalAmount" DECIMAL;
ALTER TABLE "ExecutionRun" ADD COLUMN "auditJson" JSONB;

-- CreateTable
CREATE TABLE "ExecutionLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "weightPct" DECIMAL NOT NULL,
    "targetAmount" DECIMAL NOT NULL,
    "quotePrice" DECIMAL,
    "quoteSource" TEXT,
    "quantity" DECIMAL,
    "status" TEXT NOT NULL,
    "failureReason" TEXT,
    "manualPriceOverride" DECIMAL,
    "manualNote" TEXT,
    "overriddenAt" DATETIME,
    "transactionId" TEXT,
    CONSTRAINT "ExecutionLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExecutionLine_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExecutionLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionRun_planId_targetMonth_key" ON "ExecutionRun"("planId", "targetMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionLine_transactionId_key" ON "ExecutionLine"("transactionId");

-- CreateIndex
CREATE INDEX "ExecutionLine_runId_idx" ON "ExecutionLine"("runId");

-- CreateIndex
CREATE INDEX "ExecutionLine_instrumentId_idx" ON "ExecutionLine"("instrumentId");
