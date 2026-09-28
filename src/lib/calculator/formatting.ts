/**
 * Currency and number formatting utilities.
 * Uses Intl.NumberFormat — no hand-rolled separators, no floating-point display errors.
 *
 * All currency math in the engine rounds through roundToCents() so display
 * values never show artifacts like $1234567.8899999.
 */

/** Round to cents to avoid floating-point display errors. Single choke point. */
export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a dollar amount as "$100,000,000" (rounded to whole dollars). */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return usdWhole.format(Math.round(value));
}

/** Format a dollar amount with cents, e.g. "$1,234.56". */
export function formatCurrencyExact(value: number): string {
  if (!Number.isFinite(value)) return "$0.00";
  return usdExact.format(value);
}

/** Format a decimal rate as a percent string, e.g. 0.3721 -> "37.21%". */
export function formatPercent(rate: number, digits = 2): string {
  if (!Number.isFinite(rate)) return "0%";
  return `${(rate * 100).toFixed(digits)}%`;
}

/**
 * Parse a user-typed currency string into a number.
 * Accepts "$100,000,000", "100000000", "48,000,000.50".
 * Returns null for empty, non-numeric, or negative input.
 */
/**
 * Parse a user-entered dollar amount: accepts "$1,234.56", "1234", " 1,234 ".
 * Commas must use proper thousands grouping ("1,2,3" is rejected as a typo).
 * Returns null for empty, negative, or malformed input.
 */
export function parseCurrencyInput(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.includes("-")) return null;
  if (/[^0-9$,.\s]/.test(trimmed)) return null;

  const cleaned = trimmed.replace(/[$\s]/g, "");
  const dotParts = cleaned.split(".");
  if (dotParts.length > 2) return null;
  const intPart = dotParts[0] ?? "";
  const fracPart = dotParts[1] ?? "";
  if (fracPart !== "" && !/^\d{1,2}$/.test(fracPart)) return null;

  const digits = intPart.replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (intPart.includes(",") && !/^\d{1,3}(,\d{3})+$/.test(intPart)) return null;

  const value = Number(fracPart === "" ? digits : `${digits}.${fracPart}`);
  return Number.isFinite(value) ? value : null;
}
