export {};

const { PrismaClient } = require("@prisma/client");
const {
  importExpensesCsv,
  importHoldingsCsv,
  importTransactionsCsv,
  importSuDebtPostingsCsv,
} = require("../src/imports/service");

function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const kind = args.kind;
  const filePath = args.file;
  const userId = args.userId;
  const maxRows = args.maxRows ? Number(args.maxRows) : undefined;
  const mappingOverrides = args.mapping ? JSON.parse(args.mapping) : undefined;

  if (!kind || !filePath || !userId) {
    console.error(
      "Usage: node dist/scripts/import-csv.js --kind holdings|expenses|transactions|su-debt --file <path> --userId <id> [--mapping <json>] [--maxRows <n>]",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    let result;
    if (kind === "holdings") {
      result = await importHoldingsCsv(prisma, { userId, filePath, mappingOverrides, maxRows });
    } else if (kind === "expenses") {
      result = await importExpensesCsv(prisma, { userId, filePath, mappingOverrides, maxRows });
    } else if (kind === "transactions") {
      result = await importTransactionsCsv(prisma, { userId, filePath, mappingOverrides, maxRows });
    } else if (kind === "su-debt" || kind === "su_debt" || kind === "su-debt-postings") {
      result = await importSuDebtPostingsCsv(prisma, { userId, filePath, mappingOverrides, maxRows });
    } else {
      throw new Error(`Unsupported kind '${kind}'. Use holdings, expenses, transactions, or su-debt.`);
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Import failed:", error);
  process.exitCode = 1;
});
