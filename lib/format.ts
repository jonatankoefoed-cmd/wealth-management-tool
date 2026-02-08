const dkkFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactDkkFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  notation: "compact",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("da-DK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

export function asNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return value;
}

export function formatDKK(value: number | string | null | undefined): string {
  return dkkFormatter.format(asNumber(value));
}

export function formatCompactDKK(value: number | string | null | undefined): string {
  return compactDkkFormatter.format(asNumber(value));
}

export function formatNumber(value: number | string | null | undefined): string {
  return numberFormatter.format(asNumber(value));
}

export function formatQuantity(value: number | string | null | undefined): string {
  return quantityFormatter.format(asNumber(value));
}

export function formatPercent(value: number | string | null | undefined, digits = 2): string {
  const numeric = asNumber(value);
  return `${numeric.toFixed(digits)}%`;
}

export function monthKeyNow(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
