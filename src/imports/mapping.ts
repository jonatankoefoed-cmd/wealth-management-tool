export type ImportKindKey = "holdings" | "expenses" | "transactions" | "su_debt";

interface MappingConfig {
  required: string[];
  optional: string[];
  aliases: Record<string, string[]>;
}

export interface MappingResult {
  mapping: Record<string, string>;
  missingRequired: string[];
}

const HOLDINGS_CONFIG: MappingConfig = {
  required: [
    "as_of_date",
    "account_name",
    "instrument_name",
    "asset_type",
    "quantity",
    "avg_cost",
  ],
  optional: ["ticker", "isin", "cost_currency", "instrument_currency", "tax_bucket", "note"],
  aliases: {
    as_of_date: ["date", "asof", "as_of", "snapshot_date"],
    account_name: ["account", "accountname", "depot", "portfolio"],
    instrument_name: ["name", "security", "instrument", "paper", "valuepapir", "fund", "etf"],
    ticker: ["symbol", "ticker"],
    isin: ["isin", "isin_code"],
    asset_type: ["assettype", "asset", "instrument_type", "security_type"],
    quantity: ["qty", "antal", "units", "shares"],
    avg_cost: ["avg_price", "average_cost", "gennemsnitskurs", "cost_basis", "avg_kurs"],
    cost_currency: ["currency", "cost_ccy", "costcurrency"],
    instrument_currency: ["instrument_ccy", "instrumentcurrency", "security_currency"],
    tax_bucket: ["tax", "tax_category", "skat"],
    note: ["comment", "remarks", "memo"],
  },
};

const EXPENSES_CONFIG: MappingConfig = {
  required: ["category", "name", "amount", "frequency"],
  optional: ["currency", "start_date", "end_date", "note"],
  aliases: {
    category: ["group", "type", "kategori"],
    name: ["label", "description", "expense_name"],
    amount: ["value", "cost", "beløb", "belob"],
    currency: ["ccy", "currency_code"],
    frequency: ["cadence", "interval", "period"],
    start_date: ["start", "from_date", "valid_from"],
    end_date: ["end", "to_date", "valid_to"],
    note: ["comment", "remarks", "memo"],
  },
};

const TRANSACTIONS_CONFIG: MappingConfig = {
  required: ["date", "account_name", "type", "instrument_name", "quantity", "price"],
  optional: ["ticker", "isin", "fees", "currency", "amount", "source", "note"],
  aliases: {
    date: ["trade_date", "execution_date", "dato"],
    account_name: ["account", "accountname", "depot", "portfolio"],
    type: ["transaction_type", "side", "buy/sell", "kategori"],
    instrument_name: ["name", "security", "instrument", "paper", "valuepapir"],
    ticker: ["symbol", "ticker"],
    isin: ["isin", "isin_code"],
    quantity: ["qty", "antal", "units", "shares"],
    price: ["kurs", "unit_price", "trade_price"],
    fees: ["fee", "commission", "kurtage", "omkostninger"],
    currency: ["ccy", "currency_code"],
    amount: ["cash_amount", "beløb", "belob"],
    source: ["origin", "provider", "import_source"],
    note: ["comment", "remarks", "memo"],
  },
};

const SU_DEBT_CONFIG: MappingConfig = {
  required: ["date", "type", "amount"],
  optional: ["currency", "note"],
  aliases: {
    date: ["posting_date", "transaction_date", "dato"],
    type: ["posting_type", "entry_type", "kategori"],
    amount: ["value", "beløb", "belob", "cash_amount"],
    currency: ["ccy", "currency_code"],
    note: ["comment", "remarks", "memo", "description"],
  },
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\/]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getConfig(kind: ImportKindKey): MappingConfig {
  if (kind === "holdings") {
    return HOLDINGS_CONFIG;
  }
  if (kind === "transactions") {
    return TRANSACTIONS_CONFIG;
  }
  if (kind === "su_debt") {
    return SU_DEBT_CONFIG;
  }
  return EXPENSES_CONFIG;
}

function findOriginalHeader(headers: string[], wanted: string): string | undefined {
  const normalizedWanted = normalizeHeader(wanted);
  return headers.find((header) => normalizeHeader(header) === normalizedWanted);
}

export function autoMapHeaders(
  kind: ImportKindKey,
  headers: string[],
  overrides?: Record<string, string>,
): MappingResult {
  const config = getConfig(kind);
  const allFields = [...config.required, ...config.optional];
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();

  for (const field of allFields) {
    const overrideValue = overrides?.[field];
    if (overrideValue) {
      const originalHeader = findOriginalHeader(headers, overrideValue);
      if (originalHeader && !usedHeaders.has(originalHeader)) {
        mapping[field] = originalHeader;
        usedHeaders.add(originalHeader);
      }
      continue;
    }

    const candidates = [field, ...(config.aliases[field] || [])];
    for (const candidate of candidates) {
      const found = findOriginalHeader(headers, candidate);
      if (found && !usedHeaders.has(found)) {
        mapping[field] = found;
        usedHeaders.add(found);
        break;
      }
    }
  }

  const missingRequired = config.required.filter((field) => !mapping[field]);
  return { mapping, missingRequired };
}
