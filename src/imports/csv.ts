export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export class CsvParseError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => cell.trim() === "");
}

export function parseCsv(content: string, maxRows = 50000): ParsedCsv {
  const input = content.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      rows.push(currentRow);
      currentRow = [];
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    throw new CsvParseError("CSV_UNCLOSED_QUOTE", "CSV has an unclosed quoted field.");
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  while (rows.length > 0 && isRowEmpty(rows[rows.length - 1])) {
    rows.pop();
  }

  if (rows.length === 0) {
    throw new CsvParseError("HEADER_MISSING", "CSV file is empty or has no header row.");
  }

  const headers = rows[0].map((header) => header.trim());
  if (headers.every((header) => header.length === 0)) {
    throw new CsvParseError("HEADER_MISSING", "CSV file header row is empty.");
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > maxRows) {
    throw new CsvParseError(
      "MAX_ROWS_EXCEEDED",
      `CSV has ${dataRows.length} rows, exceeds maxRows=${maxRows}.`,
    );
  }

  return {
    headers,
    rows: dataRows,
  };
}
