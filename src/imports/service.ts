import * as fs from "node:fs";
import * as path from "node:path";
import {
  Account,
  AccountType,
  AssetType,
  DebtAccount,
  DebtKind,
  DebtPostingType,
  ImportKind,
  ImportStatus,
  Instrument,
  Prisma,
  PrismaClient,
  TaxBucket,
  TxType,
} from "@prisma/client";
import { CsvParseError, parseCsv } from "./csv";
import { autoMapHeaders } from "./mapping";
import { cleanString, normalizeCurrency, normalizeEnumToken, parseDecimalText, parseStrictDate } from "./normalize";

export interface ImportMessage {
  rowIndex: number;
  field: string;
  errorCode: string;
  message: string;
}

export interface ImportExecutionOptions {
  userId: string;
  filePath: string;
  mappingOverrides?: Record<string, string>;
  maxRows?: number;
}

export interface ImportExecutionResult {
  importJobId: string;
  kind: ImportKind;
  status: ImportStatus;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  mapping: Record<string, string>;
  rowErrors: ImportMessage[];
  warnings: ImportMessage[];
}

const DEFAULT_MAX_ROWS = 50000;
const EXPENSE_FREQUENCIES = new Set(["MONTHLY", "QUARTERLY", "ANNUAL"]);
const VALID_ASSET_TYPES = new Set(Object.values(AssetType));
const VALID_TAX_BUCKETS = new Set(Object.values(TaxBucket));
const VALID_TX_TYPES = new Set(Object.values(TxType));
const VALID_DEBT_POSTING_TYPES = new Set(Object.values(DebtPostingType));

function normalizeHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\/]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getCellValue(
  row: string[],
  headerIndexes: Map<string, number>,
  mapping: Record<string, string>,
  field: string,
): string {
  const header = mapping[field];
  if (!header) {
    return "";
  }
  const index = headerIndexes.get(header);
  if (index === undefined) {
    return "";
  }
  return row[index] ?? "";
}

function evaluateStatus(importedRows: number, rowErrors: ImportMessage[]): ImportStatus {
  if (importedRows === 0) {
    return ImportStatus.FAILED;
  }
  if (rowErrors.length > 0) {
    return ImportStatus.PARTIAL;
  }
  return ImportStatus.SUCCESS;
}

function buildHeaderIndex(headers: string[]): { index: Map<string, number>; duplicateHeader?: string } {
  const index = new Map<string, number>();
  const normalizedSeen = new Set<string>();

  for (let headerIndex = 0; headerIndex < headers.length; headerIndex += 1) {
    const header = headers[headerIndex];
    index.set(header, headerIndex);
    const normalized = normalizeHeaderKey(header);
    if (normalizedSeen.has(normalized)) {
      return { index, duplicateHeader: header };
    }
    normalizedSeen.add(normalized);
  }

  return { index };
}

async function createImportJob(
  prisma: PrismaClient,
  userId: string,
  kind: ImportKind,
  filePath: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`User ${userId} not found.`);
  }

  return prisma.importJob.create({
    data: {
      userId,
      kind,
      status: ImportStatus.FAILED,
      sourceFile: path.basename(filePath),
    },
  });
}

async function finalizeImportJob(
  prisma: PrismaClient,
  importJobId: string,
  status: ImportStatus,
  mapping: Record<string, string>,
  rowErrors: ImportMessage[],
  warnings: ImportMessage[],
  totalRows: number,
  importedRows: number,
) {
  const errorsPayload =
    rowErrors.length > 0 || warnings.length > 0
      ? {
          rowErrors,
          warnings,
          summary: {
            totalRows,
            importedRows,
            rejectedRows: rowErrors.length > 0 ? new Set(rowErrors.map((item) => item.rowIndex)).size : 0,
          },
        }
      : undefined;

  await prisma.importJob.update({
    where: { id: importJobId },
    data: {
      status,
      mappingJson: mapping,
      errorsJson: errorsPayload ? (errorsPayload as unknown as Prisma.InputJsonValue) : undefined,
    },
  });
}

async function getOrCreateAccount(
  prisma: PrismaClient,
  userId: string,
  accountName: string,
  cache: Map<string, Account>,
): Promise<Account> {
  const cacheKey = accountName.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const existing = await prisma.account.findFirst({
    where: { userId, name: accountName },
  });
  if (existing) {
    cache.set(cacheKey, existing);
    return existing;
  }

  const created = await prisma.account.create({
    data: {
      userId,
      type: AccountType.BROKERAGE,
      name: accountName,
      currency: "DKK",
    },
  });
  cache.set(cacheKey, created);
  return created;
}

async function getOrCreateInstrument(
  prisma: PrismaClient,
  row: {
    isin: string;
    ticker: string;
    instrumentName: string;
    assetType: AssetType;
    instrumentCurrency: string;
    taxBucket: TaxBucket;
  },
  isinCache: Map<string, Instrument>,
  tickerCache: Map<string, Instrument>,
): Promise<Instrument> {
  if (row.isin) {
    const cachedByIsin = isinCache.get(row.isin);
    if (cachedByIsin) {
      return cachedByIsin;
    }
  }

  if (row.ticker) {
    const cachedByTicker = tickerCache.get(row.ticker);
    if (cachedByTicker) {
      return cachedByTicker;
    }
  }

  let instrument: Instrument | null = null;
  if (row.isin) {
    instrument = await prisma.instrument.findUnique({
      where: { isin: row.isin },
    });
  }

  if (!instrument && row.ticker) {
    instrument = await prisma.instrument.findFirst({
      where: { ticker: row.ticker },
    });
  }

  if (!instrument) {
    instrument = await prisma.instrument.create({
      data: {
        isin: row.isin || null,
        ticker: row.ticker || null,
        name: row.instrumentName,
        assetType: row.assetType,
        currency: row.instrumentCurrency,
        taxBucket: row.taxBucket,
      },
    });
  }

  if (instrument.isin) {
    isinCache.set(instrument.isin, instrument);
  }
  if (instrument.ticker) {
    tickerCache.set(instrument.ticker, instrument);
  }

  return instrument;
}

async function getOrCreateSuDebtAccount(
  prisma: PrismaClient,
  userId: string,
  warnings: ImportMessage[],
  rowIndex: number,
  cache?: Map<string, DebtAccount>,
): Promise<DebtAccount> {
  if (cache && cache.has(userId)) {
    return cache.get(userId) as DebtAccount;
  }

  const existing = await prisma.debtAccount.findFirst({
    where: {
      userId,
      kind: DebtKind.SU,
    },
  });
  if (existing) {
    if (cache) {
      cache.set(userId, existing);
    }
    return existing;
  }

  const created = await prisma.debtAccount.create({
    data: {
      userId,
      kind: DebtKind.SU,
      name: "SU Loan",
      currency: "DKK",
      annualRate: new Prisma.Decimal("0.04"),
    },
  });
  warnings.push({
    rowIndex,
    field: "debt_account",
    errorCode: "DEFAULT_APPLIED",
    message: "No SU debt account found; created default 'SU Loan' with annualRate 0.04.",
  });
  if (cache) {
    cache.set(userId, created);
  }
  return created;
}

function createRowHash(parts: Array<string | undefined | null>): string {
  return parts.map((part) => (part || "").trim().toUpperCase()).join("|");
}

export async function importHoldingsCsv(
  prisma: PrismaClient,
  options: ImportExecutionOptions,
): Promise<ImportExecutionResult> {
  const rowErrors: ImportMessage[] = [];
  const warnings: ImportMessage[] = [];
  let mapping: Record<string, string> = {};
  let totalRows = 0;
  let importedRows = 0;
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;

  const importJob = await createImportJob(prisma, options.userId, ImportKind.HOLDINGS_CSV, options.filePath);

  let content = "";
  try {
    content = fs.readFileSync(options.filePath, "utf8");
  } catch (error) {
    rowErrors.push({
      rowIndex: 0,
      field: "file",
      errorCode: "FILE_READ_ERROR",
      message: `Could not read file: ${(error as Error).message}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.HOLDINGS_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: 0,
      mapping,
      rowErrors,
      warnings,
    };
  }

  let parsed;
  try {
    parsed = parseCsv(content, maxRows);
  } catch (error) {
    const message =
      error instanceof CsvParseError ? `${error.code}: ${error.message}` : `CSV parse failure: ${(error as Error).message}`;
    rowErrors.push({
      rowIndex: 0,
      field: "file",
      errorCode: "PARSE_ERROR",
      message,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.HOLDINGS_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: 0,
      mapping,
      rowErrors,
      warnings,
    };
  }

  totalRows = parsed.rows.length;
  const mapped = autoMapHeaders("holdings", parsed.headers, options.mappingOverrides);
  mapping = mapped.mapping;

  if (mapped.missingRequired.length > 0) {
    rowErrors.push({
      rowIndex: 0,
      field: mapped.missingRequired.join(","),
      errorCode: "MAPPING_REQUIRED",
      message: `Missing required mapping for: ${mapped.missingRequired.join(", ")}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.HOLDINGS_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: totalRows,
      mapping,
      rowErrors,
      warnings,
    };
  }

  const headerResult = buildHeaderIndex(parsed.headers);
  if (headerResult.duplicateHeader) {
    rowErrors.push({
      rowIndex: 0,
      field: "header",
      errorCode: "DUPLICATE_HEADER",
      message: `Duplicate or ambiguous header found: ${headerResult.duplicateHeader}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.HOLDINGS_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: totalRows,
      mapping,
      rowErrors,
      warnings,
    };
  }

  const headerIndexes = headerResult.index;
  const accountCache = new Map<string, Account>();
  const isinCache = new Map<string, Instrument>();
  const tickerCache = new Map<string, Instrument>();
  const snapshotCache = new Map<string, string>();
  const snapshotInstrumentSet = new Map<string, Set<string>>();

  for (let rowNumber = 0; rowNumber < parsed.rows.length; rowNumber += 1) {
    const rowIndex = rowNumber + 1;
    const row = parsed.rows[rowNumber];
    const rowValidationErrors: ImportMessage[] = [];

    const asOfDateRaw = getCellValue(row, headerIndexes, mapping, "as_of_date");
    const accountNameRaw = getCellValue(row, headerIndexes, mapping, "account_name");
    const instrumentNameRaw = getCellValue(row, headerIndexes, mapping, "instrument_name");
    const tickerRaw = getCellValue(row, headerIndexes, mapping, "ticker");
    const isinRaw = getCellValue(row, headerIndexes, mapping, "isin");
    const assetTypeRaw = getCellValue(row, headerIndexes, mapping, "asset_type");
    const quantityRaw = getCellValue(row, headerIndexes, mapping, "quantity");
    const avgCostRaw = getCellValue(row, headerIndexes, mapping, "avg_cost");
    const costCurrencyRaw = getCellValue(row, headerIndexes, mapping, "cost_currency");
    const instrumentCurrencyRaw = getCellValue(row, headerIndexes, mapping, "instrument_currency");
    const taxBucketRaw = getCellValue(row, headerIndexes, mapping, "tax_bucket");

    const asOfDate = parseStrictDate(asOfDateRaw);
    if (!asOfDate) {
      rowValidationErrors.push({
        rowIndex,
        field: "as_of_date",
        errorCode: "PARSE_ERROR",
        message: "as_of_date is required and must be YYYY-MM-DD.",
      });
    }

    const accountName = cleanString(accountNameRaw);
    if (!accountName) {
      rowValidationErrors.push({
        rowIndex,
        field: "account_name",
        errorCode: "REQUIRED_MISSING",
        message: "account_name is required.",
      });
    }

    const instrumentName = cleanString(instrumentNameRaw);
    if (!instrumentName) {
      rowValidationErrors.push({
        rowIndex,
        field: "instrument_name",
        errorCode: "REQUIRED_MISSING",
        message: "instrument_name is required.",
      });
    }

    const ticker = cleanString(tickerRaw).toUpperCase();
    const isin = cleanString(isinRaw).toUpperCase();
    if (!ticker && !isin) {
      rowValidationErrors.push({
        rowIndex,
        field: "ticker|isin",
        errorCode: "REQUIRED_MISSING",
        message: "Either ticker or isin must be present.",
      });
    }

    const assetTypeToken = normalizeEnumToken(assetTypeRaw);
    if (!VALID_ASSET_TYPES.has(assetTypeToken as AssetType)) {
      rowValidationErrors.push({
        rowIndex,
        field: "asset_type",
        errorCode: "INVALID_ENUM",
        message: "asset_type must be one of STOCK|ETF|FUND|OTHER.",
      });
    }

    const quantityText = parseDecimalText(quantityRaw);
    if (!quantityText) {
      rowValidationErrors.push({
        rowIndex,
        field: "quantity",
        errorCode: "PARSE_ERROR",
        message: "quantity is required and must be a decimal.",
      });
    } else if (new Prisma.Decimal(quantityText).lte(0)) {
      rowValidationErrors.push({
        rowIndex,
        field: "quantity",
        errorCode: "INVALID_VALUE",
        message: "quantity must be greater than 0.",
      });
    }

    const avgCostText = parseDecimalText(avgCostRaw);
    if (!avgCostText) {
      rowValidationErrors.push({
        rowIndex,
        field: "avg_cost",
        errorCode: "PARSE_ERROR",
        message: "avg_cost is required and must be a decimal.",
      });
    } else if (new Prisma.Decimal(avgCostText).lt(0)) {
      rowValidationErrors.push({
        rowIndex,
        field: "avg_cost",
        errorCode: "INVALID_VALUE",
        message: "avg_cost must be 0 or greater.",
      });
    }

    const costCurrency = normalizeCurrency(costCurrencyRaw, "DKK");
    if (!costCurrency) {
      rowValidationErrors.push({
        rowIndex,
        field: "cost_currency",
        errorCode: "PARSE_ERROR",
        message: "cost_currency must be a valid ISO 4217 code.",
      });
    }

    let instrumentCurrency = normalizeCurrency(instrumentCurrencyRaw, "");
    if (!instrumentCurrencyRaw.trim()) {
      instrumentCurrency = costCurrency || "DKK";
      warnings.push({
        rowIndex,
        field: "instrument_currency",
        errorCode: "DEFAULT_APPLIED",
        message: `instrument_currency missing; defaulted to ${instrumentCurrency}.`,
      });
    } else if (!instrumentCurrency) {
      rowValidationErrors.push({
        rowIndex,
        field: "instrument_currency",
        errorCode: "PARSE_ERROR",
        message: "instrument_currency must be a valid ISO 4217 code.",
      });
    }

    let taxBucketToken = normalizeEnumToken(taxBucketRaw);
    if (!taxBucketToken) {
      taxBucketToken = TaxBucket.UNKNOWN;
      warnings.push({
        rowIndex,
        field: "tax_bucket",
        errorCode: "DEFAULT_APPLIED",
        message: "tax_bucket missing; defaulted to UNKNOWN.",
      });
    } else if (!VALID_TAX_BUCKETS.has(taxBucketToken as TaxBucket)) {
      rowValidationErrors.push({
        rowIndex,
        field: "tax_bucket",
        errorCode: "INVALID_ENUM",
        message: "tax_bucket must be EQUITY_INCOME|CAPITAL_INCOME|UNKNOWN.",
      });
    }

    if (rowValidationErrors.length > 0) {
      rowErrors.push(...rowValidationErrors);
      continue;
    }

    try {
      const account = await getOrCreateAccount(prisma, options.userId, accountName, accountCache);
      const instrument = await getOrCreateInstrument(
        prisma,
        {
          isin,
          ticker,
          instrumentName,
          assetType: assetTypeToken as AssetType,
          instrumentCurrency: instrumentCurrency as string,
          taxBucket: taxBucketToken as TaxBucket,
        },
        isinCache,
        tickerCache,
      );

      const snapshotKey = `${asOfDate?.toISOString().slice(0, 10)}|${account.id}`;
      let snapshotId = snapshotCache.get(snapshotKey);
      if (!snapshotId) {
        const snapshot = await prisma.holdingsSnapshot.create({
          data: {
            userId: options.userId,
            accountId: account.id,
            asOfDate: asOfDate as Date,
            currency: account.currency || "DKK",
            importJobId: importJob.id,
          },
        });
        snapshotId = snapshot.id;
        snapshotCache.set(snapshotKey, snapshot.id);
      }

      const instrumentsInSnapshot = snapshotInstrumentSet.get(snapshotKey) || new Set<string>();
      if (instrumentsInSnapshot.has(instrument.id)) {
        rowErrors.push({
          rowIndex,
          field: "instrument",
          errorCode: "AMBIGUOUS_ROW",
          message: "Duplicate instrument in same account and as_of_date snapshot.",
        });
        snapshotInstrumentSet.set(snapshotKey, instrumentsInSnapshot);
        continue;
      }

      await prisma.holdingsSnapshotLine.create({
        data: {
          snapshotId,
          instrumentId: instrument.id,
          quantity: new Prisma.Decimal(quantityText as string),
          avgCost: new Prisma.Decimal(avgCostText as string),
          costCurrency: costCurrency as string,
        },
      });
      instrumentsInSnapshot.add(instrument.id);
      snapshotInstrumentSet.set(snapshotKey, instrumentsInSnapshot);
      importedRows += 1;
    } catch (error) {
      rowErrors.push({
        rowIndex,
        field: "row",
        errorCode: "DB_WRITE_ERROR",
        message: `Failed to persist row: ${(error as Error).message}`,
      });
    }
  }

  const status = evaluateStatus(importedRows, rowErrors);
  await finalizeImportJob(prisma, importJob.id, status, mapping, rowErrors, warnings, totalRows, importedRows);

  const rejectedRows = new Set(rowErrors.filter((item) => item.rowIndex > 0).map((item) => item.rowIndex)).size;
  return {
    importJobId: importJob.id,
    kind: ImportKind.HOLDINGS_CSV,
    status,
    totalRows,
    importedRows,
    rejectedRows,
    mapping,
    rowErrors,
    warnings,
  };
}

export async function importTransactionsCsv(
  prisma: PrismaClient,
  options: ImportExecutionOptions,
): Promise<ImportExecutionResult> {
  const rowErrors: ImportMessage[] = [];
  const warnings: ImportMessage[] = [];
  let mapping: Record<string, string> = {};
  let totalRows = 0;
  let importedRows = 0;
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;

  const importJob = await createImportJob(prisma, options.userId, ImportKind.TRANSACTIONS_CSV, options.filePath);

  let content = "";
  try {
    content = fs.readFileSync(options.filePath, "utf8");
  } catch (error) {
    rowErrors.push({
      rowIndex: 0,
      field: "file",
      errorCode: "FILE_READ_ERROR",
      message: `Could not read file: ${(error as Error).message}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.TRANSACTIONS_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: 0,
      mapping,
      rowErrors,
      warnings,
    };
  }

  let parsed;
  try {
    parsed = parseCsv(content, maxRows);
  } catch (error) {
    const message =
      error instanceof CsvParseError ? `${error.code}: ${error.message}` : `CSV parse failure: ${(error as Error).message}`;
    rowErrors.push({
      rowIndex: 0,
      field: "file",
      errorCode: "PARSE_ERROR",
      message,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.TRANSACTIONS_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: 0,
      mapping,
      rowErrors,
      warnings,
    };
  }

  totalRows = parsed.rows.length;
  const mapped = autoMapHeaders("transactions", parsed.headers, options.mappingOverrides);
  mapping = mapped.mapping;

  if (mapped.missingRequired.length > 0) {
    rowErrors.push({
      rowIndex: 0,
      field: mapped.missingRequired.join(","),
      errorCode: "MAPPING_REQUIRED",
      message: `Missing required mapping for: ${mapped.missingRequired.join(", ")}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.TRANSACTIONS_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: totalRows,
      mapping,
      rowErrors,
      warnings,
    };
  }

  const headerResult = buildHeaderIndex(parsed.headers);
  if (headerResult.duplicateHeader) {
    rowErrors.push({
      rowIndex: 0,
      field: "header",
      errorCode: "DUPLICATE_HEADER",
      message: `Duplicate or ambiguous header found: ${headerResult.duplicateHeader}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.TRANSACTIONS_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: totalRows,
      mapping,
      rowErrors,
      warnings,
    };
  }

  const headerIndexes = headerResult.index;
  const accountCache = new Map<string, Account>();
  const isinCache = new Map<string, Instrument>();
  const tickerCache = new Map<string, Instrument>();
  const rowHashes = new Set<string>();

  for (let rowNumber = 0; rowNumber < parsed.rows.length; rowNumber += 1) {
    const rowIndex = rowNumber + 1;
    const row = parsed.rows[rowNumber];
    const rowValidationErrors: ImportMessage[] = [];

    const dateRaw = getCellValue(row, headerIndexes, mapping, "date");
    const accountNameRaw = getCellValue(row, headerIndexes, mapping, "account_name");
    const typeRaw = getCellValue(row, headerIndexes, mapping, "type");
    const instrumentNameRaw = getCellValue(row, headerIndexes, mapping, "instrument_name");
    const tickerRaw = getCellValue(row, headerIndexes, mapping, "ticker");
    const isinRaw = getCellValue(row, headerIndexes, mapping, "isin");
    const quantityRaw = getCellValue(row, headerIndexes, mapping, "quantity");
    const priceRaw = getCellValue(row, headerIndexes, mapping, "price");
    const feesRaw = getCellValue(row, headerIndexes, mapping, "fees");
    const currencyRaw = getCellValue(row, headerIndexes, mapping, "currency");
    const amountRaw = getCellValue(row, headerIndexes, mapping, "amount");
    const sourceRaw = getCellValue(row, headerIndexes, mapping, "source");

    const txDate = parseStrictDate(dateRaw);
    if (!txDate) {
      rowValidationErrors.push({
        rowIndex,
        field: "date",
        errorCode: "PARSE_ERROR",
        message: "date is required and must be YYYY-MM-DD.",
      });
    }

    const accountName = cleanString(accountNameRaw);
    if (!accountName) {
      rowValidationErrors.push({
        rowIndex,
        field: "account_name",
        errorCode: "REQUIRED_MISSING",
        message: "account_name is required.",
      });
    }

    const txTypeToken = normalizeEnumToken(typeRaw);
    if (!VALID_TX_TYPES.has(txTypeToken as TxType)) {
      rowValidationErrors.push({
        rowIndex,
        field: "type",
        errorCode: "INVALID_ENUM",
        message: "type must be BUY|SELL|DIVIDEND|FEE|ADJUSTMENT.",
      });
    }

    const txType = txTypeToken as TxType;
    const requiresInstrument = txType === TxType.BUY || txType === TxType.SELL || txType === TxType.DIVIDEND;
    const isFeeOrAdjustment = txType === TxType.FEE || txType === TxType.ADJUSTMENT;

    const instrumentName = cleanString(instrumentNameRaw);
    const ticker = cleanString(tickerRaw).toUpperCase();
    const isin = cleanString(isinRaw).toUpperCase();
    if (requiresInstrument) {
      if (!instrumentName) {
        rowValidationErrors.push({
          rowIndex,
          field: "instrument_name",
          errorCode: "REQUIRED_MISSING",
          message: "instrument_name is required for BUY, SELL, and DIVIDEND.",
        });
      }
      if (!isin && !ticker) {
        rowValidationErrors.push({
          rowIndex,
          field: "isin|ticker",
          errorCode: "REQUIRED_MISSING",
          message: "Either isin or ticker is required for BUY, SELL, and DIVIDEND.",
        });
      }
    }

    const quantityText = parseDecimalText(quantityRaw);
    const priceText = parseDecimalText(priceRaw);
    const amountText = parseDecimalText(amountRaw);

    if (txType === TxType.BUY || txType === TxType.SELL) {
      if (!quantityText) {
        rowValidationErrors.push({
          rowIndex,
          field: "quantity",
          errorCode: "REQUIRED_MISSING",
          message: "quantity is required for BUY and SELL.",
        });
      } else if (new Prisma.Decimal(quantityText).lte(0)) {
        rowValidationErrors.push({
          rowIndex,
          field: "quantity",
          errorCode: "INVALID_VALUE",
          message: "quantity must be greater than 0 for BUY and SELL.",
        });
      }

      if (!priceText) {
        rowValidationErrors.push({
          rowIndex,
          field: "price",
          errorCode: "REQUIRED_MISSING",
          message: "price is required for BUY and SELL.",
        });
      } else if (new Prisma.Decimal(priceText).lte(0)) {
        rowValidationErrors.push({
          rowIndex,
          field: "price",
          errorCode: "INVALID_VALUE",
          message: "price must be greater than 0 for BUY and SELL.",
        });
      }
    }

    if (txType === TxType.DIVIDEND) {
      const hasDerivedAmount = Boolean(quantityText && priceText);
      if (!amountText && !hasDerivedAmount) {
        rowValidationErrors.push({
          rowIndex,
          field: "amount",
          errorCode: "REQUIRED_MISSING",
          message: "DIVIDEND requires amount, or both quantity and price.",
        });
      }
      if (quantityText && new Prisma.Decimal(quantityText).lte(0)) {
        rowValidationErrors.push({
          rowIndex,
          field: "quantity",
          errorCode: "INVALID_VALUE",
          message: "quantity must be greater than 0 when provided.",
        });
      }
      if (priceText && new Prisma.Decimal(priceText).lt(0)) {
        rowValidationErrors.push({
          rowIndex,
          field: "price",
          errorCode: "INVALID_VALUE",
          message: "price must be greater than or equal to 0 when provided.",
        });
      }
    }

    if (isFeeOrAdjustment && !amountText) {
      rowValidationErrors.push({
        rowIndex,
        field: "amount",
        errorCode: "REQUIRED_MISSING",
        message: "amount is required for FEE and ADJUSTMENT.",
      });
    }

    const feesInput = cleanString(feesRaw);
    let feesText = "0";
    if (feesInput) {
      const parsedFees = parseDecimalText(feesInput);
      if (!parsedFees) {
        rowValidationErrors.push({
          rowIndex,
          field: "fees",
          errorCode: "PARSE_ERROR",
          message: "fees must be a decimal when provided.",
        });
      } else if (new Prisma.Decimal(parsedFees).lt(0)) {
        rowValidationErrors.push({
          rowIndex,
          field: "fees",
          errorCode: "INVALID_VALUE",
          message: "fees must be 0 or greater.",
        });
      } else {
        feesText = parsedFees;
      }
    }

    const currency = normalizeCurrency(currencyRaw, "DKK");
    if (!cleanString(currencyRaw)) {
      warnings.push({
        rowIndex,
        field: "currency",
        errorCode: "DEFAULT_APPLIED",
        message: "currency missing; defaulted to DKK.",
      });
    } else if (!currency) {
      rowValidationErrors.push({
        rowIndex,
        field: "currency",
        errorCode: "PARSE_ERROR",
        message: "currency must be a valid ISO 4217 code.",
      });
    }

    if (rowValidationErrors.length > 0) {
      rowErrors.push(...rowValidationErrors);
      continue;
    }

    let effectiveAmountText: string | null = amountText;
    if (!effectiveAmountText && txType === TxType.DIVIDEND && quantityText && priceText) {
      effectiveAmountText = new Prisma.Decimal(quantityText).mul(new Prisma.Decimal(priceText)).toString();
    }

    const rowHash = createRowHash([
      txDate?.toISOString().slice(0, 10),
      accountName,
      txType,
      isin,
      ticker,
      quantityText || "",
      priceText || "",
      effectiveAmountText || "",
      feesText,
      currency || "",
      cleanString(sourceRaw) || "transactions_import",
    ]);
    if (rowHashes.has(rowHash)) {
      warnings.push({
        rowIndex,
        field: "row",
        errorCode: "DUPLICATE_ROW_SKIPPED",
        message: "Duplicate row within this import job skipped.",
      });
      continue;
    }
    rowHashes.add(rowHash);

    try {
      const account = await getOrCreateAccount(prisma, options.userId, accountName, accountCache);
      let instrumentId: string | null = null;
      if (requiresInstrument || isin || ticker) {
        const instrument = await getOrCreateInstrument(
          prisma,
          {
            isin,
            ticker,
            instrumentName: instrumentName || ticker || isin || "Unknown Instrument",
            assetType: AssetType.OTHER,
            instrumentCurrency: (currency as string) || "DKK",
            taxBucket: TaxBucket.UNKNOWN,
          },
          isinCache,
          tickerCache,
        );
        instrumentId = instrument.id;
      }

      const createdTransaction = await prisma.transaction.create({
        data: {
          userId: options.userId,
          accountId: account.id,
          instrumentId,
          date: txDate as Date,
          type: txType,
          quantity: quantityText ? new Prisma.Decimal(quantityText) : null,
          price: priceText ? new Prisma.Decimal(priceText) : null,
          fees: new Prisma.Decimal(feesText),
          currency: currency as string,
          source: cleanString(sourceRaw) || "transactions_import",
          importJobId: importJob.id,
        },
      });
      if (effectiveAmountText) {
        await prisma.$executeRawUnsafe(
          'UPDATE "Transaction" SET "amount" = ? WHERE "id" = ?',
          effectiveAmountText,
          createdTransaction.id,
        );
      }
      importedRows += 1;
    } catch (error) {
      rowErrors.push({
        rowIndex,
        field: "row",
        errorCode: "DB_WRITE_ERROR",
        message: `Failed to persist row: ${(error as Error).message}`,
      });
    }
  }

  const status = evaluateStatus(importedRows, rowErrors);
  await finalizeImportJob(prisma, importJob.id, status, mapping, rowErrors, warnings, totalRows, importedRows);

  const rejectedRows = new Set(rowErrors.filter((item) => item.rowIndex > 0).map((item) => item.rowIndex)).size;
  return {
    importJobId: importJob.id,
    kind: ImportKind.TRANSACTIONS_CSV,
    status,
    totalRows,
    importedRows,
    rejectedRows,
    mapping,
    rowErrors,
    warnings,
  };
}

export async function importExpensesCsv(
  prisma: PrismaClient,
  options: ImportExecutionOptions,
): Promise<ImportExecutionResult> {
  const rowErrors: ImportMessage[] = [];
  const warnings: ImportMessage[] = [];
  let mapping: Record<string, string> = {};
  let totalRows = 0;
  let importedRows = 0;
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;

  const importJob = await createImportJob(prisma, options.userId, ImportKind.EXPENSES_CSV, options.filePath);

  let content = "";
  try {
    content = fs.readFileSync(options.filePath, "utf8");
  } catch (error) {
    rowErrors.push({
      rowIndex: 0,
      field: "file",
      errorCode: "FILE_READ_ERROR",
      message: `Could not read file: ${(error as Error).message}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.EXPENSES_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: 0,
      mapping,
      rowErrors,
      warnings,
    };
  }

  let parsed;
  try {
    parsed = parseCsv(content, maxRows);
  } catch (error) {
    const message =
      error instanceof CsvParseError ? `${error.code}: ${error.message}` : `CSV parse failure: ${(error as Error).message}`;
    rowErrors.push({
      rowIndex: 0,
      field: "file",
      errorCode: "PARSE_ERROR",
      message,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.EXPENSES_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: 0,
      mapping,
      rowErrors,
      warnings,
    };
  }

  totalRows = parsed.rows.length;
  const mapped = autoMapHeaders("expenses", parsed.headers, options.mappingOverrides);
  mapping = mapped.mapping;

  if (mapped.missingRequired.length > 0) {
    rowErrors.push({
      rowIndex: 0,
      field: mapped.missingRequired.join(","),
      errorCode: "MAPPING_REQUIRED",
      message: `Missing required mapping for: ${mapped.missingRequired.join(", ")}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.EXPENSES_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: totalRows,
      mapping,
      rowErrors,
      warnings,
    };
  }

  const headerResult = buildHeaderIndex(parsed.headers);
  if (headerResult.duplicateHeader) {
    rowErrors.push({
      rowIndex: 0,
      field: "header",
      errorCode: "DUPLICATE_HEADER",
      message: `Duplicate or ambiguous header found: ${headerResult.duplicateHeader}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.EXPENSES_CSV,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: totalRows,
      mapping,
      rowErrors,
      warnings,
    };
  }

  const headerIndexes = headerResult.index;

  for (let rowNumber = 0; rowNumber < parsed.rows.length; rowNumber += 1) {
    const rowIndex = rowNumber + 1;
    const row = parsed.rows[rowNumber];
    const rowValidationErrors: ImportMessage[] = [];

    const category = cleanString(getCellValue(row, headerIndexes, mapping, "category"));
    const name = cleanString(getCellValue(row, headerIndexes, mapping, "name"));
    const amountRaw = getCellValue(row, headerIndexes, mapping, "amount");
    const currencyRaw = getCellValue(row, headerIndexes, mapping, "currency");
    const frequencyRaw = getCellValue(row, headerIndexes, mapping, "frequency");
    const startDateRaw = getCellValue(row, headerIndexes, mapping, "start_date");
    const endDateRaw = getCellValue(row, headerIndexes, mapping, "end_date");

    if (!category) {
      rowValidationErrors.push({
        rowIndex,
        field: "category",
        errorCode: "REQUIRED_MISSING",
        message: "category is required.",
      });
    }

    if (!name) {
      rowValidationErrors.push({
        rowIndex,
        field: "name",
        errorCode: "REQUIRED_MISSING",
        message: "name is required.",
      });
    }

    const amountText = parseDecimalText(amountRaw);
    if (!amountText) {
      rowValidationErrors.push({
        rowIndex,
        field: "amount",
        errorCode: "PARSE_ERROR",
        message: "amount is required and must be a decimal.",
      });
    } else if (new Prisma.Decimal(amountText).lt(0)) {
      rowValidationErrors.push({
        rowIndex,
        field: "amount",
        errorCode: "INVALID_VALUE",
        message: "amount must be 0 or greater.",
      });
    }

    const frequency = normalizeEnumToken(frequencyRaw);
    if (!EXPENSE_FREQUENCIES.has(frequency)) {
      rowValidationErrors.push({
        rowIndex,
        field: "frequency",
        errorCode: "INVALID_ENUM",
        message: "frequency must be MONTHLY|QUARTERLY|ANNUAL.",
      });
    }

    const currency = normalizeCurrency(currencyRaw, "DKK");
    if (!currencyRaw.trim()) {
      warnings.push({
        rowIndex,
        field: "currency",
        errorCode: "DEFAULT_APPLIED",
        message: "currency missing; defaulted to DKK.",
      });
    } else if (!currency) {
      rowValidationErrors.push({
        rowIndex,
        field: "currency",
        errorCode: "PARSE_ERROR",
        message: "currency must be a valid ISO 4217 code.",
      });
    }

    const startDate = parseStrictDate(startDateRaw);
    const endDate = parseStrictDate(endDateRaw);
    if (cleanString(startDateRaw) && !startDate) {
      rowValidationErrors.push({
        rowIndex,
        field: "start_date",
        errorCode: "PARSE_ERROR",
        message: "start_date must be YYYY-MM-DD when provided.",
      });
    }
    if (cleanString(endDateRaw) && !endDate) {
      rowValidationErrors.push({
        rowIndex,
        field: "end_date",
        errorCode: "PARSE_ERROR",
        message: "end_date must be YYYY-MM-DD when provided.",
      });
    }
    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      rowValidationErrors.push({
        rowIndex,
        field: "end_date",
        errorCode: "INVALID_VALUE",
        message: "end_date must be greater than or equal to start_date.",
      });
    }

    if (rowValidationErrors.length > 0) {
      rowErrors.push(...rowValidationErrors);
      continue;
    }

    try {
      await prisma.expenseLine.create({
        data: {
          userId: options.userId,
          category,
          name,
          amount: new Prisma.Decimal(amountText as string),
          currency: currency as string,
          frequency,
          startDate: startDate || null,
          endDate: endDate || null,
          importJobId: importJob.id,
        },
      });
      importedRows += 1;
    } catch (error) {
      rowErrors.push({
        rowIndex,
        field: "row",
        errorCode: "DB_WRITE_ERROR",
        message: `Failed to persist row: ${(error as Error).message}`,
      });
    }
  }

  const status = evaluateStatus(importedRows, rowErrors);
  await finalizeImportJob(prisma, importJob.id, status, mapping, rowErrors, warnings, totalRows, importedRows);

  const rejectedRows = new Set(rowErrors.filter((item) => item.rowIndex > 0).map((item) => item.rowIndex)).size;
  return {
    importJobId: importJob.id,
    kind: ImportKind.EXPENSES_CSV,
    status,
    totalRows,
    importedRows,
    rejectedRows,
    mapping,
    rowErrors,
    warnings,
  };
}

export async function importSuDebtPostingsCsv(
  prisma: PrismaClient,
  options: ImportExecutionOptions,
): Promise<ImportExecutionResult> {
  const rowErrors: ImportMessage[] = [];
  const warnings: ImportMessage[] = [];
  let mapping: Record<string, string> = {};
  let totalRows = 0;
  let importedRows = 0;
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;

  const importJob = await createImportJob(prisma, options.userId, ImportKind.OTHER, options.filePath);

  let content = "";
  try {
    content = fs.readFileSync(options.filePath, "utf8");
  } catch (error) {
    rowErrors.push({
      rowIndex: 0,
      field: "file",
      errorCode: "FILE_READ_ERROR",
      message: `Could not read file: ${(error as Error).message}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.OTHER,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: 0,
      mapping,
      rowErrors,
      warnings,
    };
  }

  let parsed;
  try {
    parsed = parseCsv(content, maxRows);
  } catch (error) {
    const message =
      error instanceof CsvParseError ? `${error.code}: ${error.message}` : `CSV parse failure: ${(error as Error).message}`;
    rowErrors.push({
      rowIndex: 0,
      field: "file",
      errorCode: "PARSE_ERROR",
      message,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.OTHER,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: 0,
      mapping,
      rowErrors,
      warnings,
    };
  }

  totalRows = parsed.rows.length;
  const mapped = autoMapHeaders("su_debt", parsed.headers, options.mappingOverrides);
  mapping = mapped.mapping;

  if (mapped.missingRequired.length > 0) {
    rowErrors.push({
      rowIndex: 0,
      field: mapped.missingRequired.join(","),
      errorCode: "MAPPING_REQUIRED",
      message: `Missing required mapping for: ${mapped.missingRequired.join(", ")}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.OTHER,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: totalRows,
      mapping,
      rowErrors,
      warnings,
    };
  }

  const headerResult = buildHeaderIndex(parsed.headers);
  if (headerResult.duplicateHeader) {
    rowErrors.push({
      rowIndex: 0,
      field: "header",
      errorCode: "DUPLICATE_HEADER",
      message: `Duplicate or ambiguous header found: ${headerResult.duplicateHeader}`,
    });
    await finalizeImportJob(prisma, importJob.id, ImportStatus.FAILED, mapping, rowErrors, warnings, totalRows, importedRows);
    return {
      importJobId: importJob.id,
      kind: ImportKind.OTHER,
      status: ImportStatus.FAILED,
      totalRows,
      importedRows,
      rejectedRows: totalRows,
      mapping,
      rowErrors,
      warnings,
    };
  }

  const headerIndexes = headerResult.index;
  const rowHashes = new Set<string>();
  const debtAccountCache = new Map<string, DebtAccount>();

  for (let rowNumber = 0; rowNumber < parsed.rows.length; rowNumber += 1) {
    const rowIndex = rowNumber + 1;
    const row = parsed.rows[rowNumber];
    const rowValidationErrors: ImportMessage[] = [];

    const dateRaw = getCellValue(row, headerIndexes, mapping, "date");
    const typeRaw = getCellValue(row, headerIndexes, mapping, "type");
    const amountRaw = getCellValue(row, headerIndexes, mapping, "amount");
    const currencyRaw = getCellValue(row, headerIndexes, mapping, "currency");
    const noteRaw = getCellValue(row, headerIndexes, mapping, "note");

    const postingDate = parseStrictDate(dateRaw);
    if (!postingDate) {
      rowValidationErrors.push({
        rowIndex,
        field: "date",
        errorCode: "PARSE_ERROR",
        message: "date is required and must be YYYY-MM-DD.",
      });
    }

    const postingTypeToken = normalizeEnumToken(typeRaw);
    if (!VALID_DEBT_POSTING_TYPES.has(postingTypeToken as DebtPostingType)) {
      rowValidationErrors.push({
        rowIndex,
        field: "type",
        errorCode: "INVALID_ENUM",
        message: "type must be DISBURSEMENT|INTEREST|REPAYMENT|ADJUSTMENT.",
      });
    }

    const amountText = parseDecimalText(amountRaw);
    if (!amountText) {
      rowValidationErrors.push({
        rowIndex,
        field: "amount",
        errorCode: "PARSE_ERROR",
        message: "amount is required and must be a decimal.",
      });
    }

    const currency = normalizeCurrency(currencyRaw, "DKK");
    if (!cleanString(currencyRaw)) {
      warnings.push({
        rowIndex,
        field: "currency",
        errorCode: "DEFAULT_APPLIED",
        message: "currency missing; defaulted to DKK.",
      });
    } else if (!currency) {
      rowValidationErrors.push({
        rowIndex,
        field: "currency",
        errorCode: "PARSE_ERROR",
        message: "currency must be a valid ISO 4217 code.",
      });
    }

    if (rowValidationErrors.length > 0) {
      rowErrors.push(...rowValidationErrors);
      continue;
    }

    const note = cleanString(noteRaw);
    const rowHash = createRowHash([
      postingDate?.toISOString().slice(0, 10),
      postingTypeToken,
      amountText,
      currency || "",
      note,
    ]);
    if (rowHashes.has(rowHash)) {
      warnings.push({
        rowIndex,
        field: "row",
        errorCode: "DUPLICATE_ROW_SKIPPED",
        message: "Duplicate row within this import job skipped.",
      });
      continue;
    }
    rowHashes.add(rowHash);

    try {
      const debtAccount = await getOrCreateSuDebtAccount(prisma, options.userId, warnings, rowIndex, debtAccountCache);
      await prisma.debtPosting.create({
        data: {
          debtAccountId: debtAccount.id,
          date: postingDate as Date,
          type: postingTypeToken as DebtPostingType,
          amount: new Prisma.Decimal(amountText as string),
          currency: currency as string,
          note: note || null,
          importJobId: importJob.id,
        },
      });
      importedRows += 1;
    } catch (error) {
      rowErrors.push({
        rowIndex,
        field: "row",
        errorCode: "DB_WRITE_ERROR",
        message: `Failed to persist row: ${(error as Error).message}`,
      });
    }
  }

  const status = evaluateStatus(importedRows, rowErrors);
  await finalizeImportJob(prisma, importJob.id, status, mapping, rowErrors, warnings, totalRows, importedRows);

  const rejectedRows = new Set(rowErrors.filter((item) => item.rowIndex > 0).map((item) => item.rowIndex)).size;
  return {
    importJobId: importJob.id,
    kind: ImportKind.OTHER,
    status,
    totalRows,
    importedRows,
    rejectedRows,
    mapping,
    rowErrors,
    warnings,
  };
}
