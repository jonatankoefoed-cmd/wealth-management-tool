export function cleanString(value: string | undefined): string {
  if (!value) {
    return "";
  }
  return value.trim();
}

export function normalizeEnumToken(value: string | undefined): string {
  return cleanString(value).toUpperCase().replace(/[\s\-]+/g, "_");
}

export function parseStrictDate(value: string | undefined): Date | null {
  const raw = cleanString(value);
  if (!raw) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function parseDecimalText(value: string | undefined): string | null {
  const raw = cleanString(value);
  if (!raw) {
    return null;
  }

  let sanitized = raw.replace(/\s+/g, "");
  sanitized = sanitized.replace(/[A-Za-z$€£¥]|kr/gi, "");
  sanitized = sanitized.replace(/[^\d,.\-]/g, "");

  if (!sanitized || sanitized === "-") {
    return null;
  }

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");

  const dotThousandsPattern = /^-?\d{1,3}(\.\d{3})+$/;
  const commaThousandsPattern = /^-?\d{1,3}(,\d{3})+$/;
  if (dotThousandsPattern.test(sanitized)) {
    sanitized = sanitized.replace(/\./g, "");
  } else if (commaThousandsPattern.test(sanitized)) {
    sanitized = sanitized.replace(/,/g, "");
  } else if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      sanitized = sanitized.replace(/\./g, "");
      sanitized = sanitized.replace(",", ".");
    } else {
      sanitized = sanitized.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    sanitized = sanitized.replace(",", ".");
  }

  const pieces = sanitized.split(".");
  if (pieces.length > 2) {
    const lastPiece = pieces.pop() as string;
    sanitized = `${pieces.join("")}.${lastPiece}`;
  }

  if (!/^-?\d+(\.\d+)?$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}

export function normalizeCurrency(value: string | undefined, fallback = "DKK"): string | null {
  const raw = cleanString(value);
  if (!raw) {
    return fallback;
  }

  const token = raw.toUpperCase();
  if (!/^[A-Z]{3}$/.test(token)) {
    return null;
  }
  return token;
}
