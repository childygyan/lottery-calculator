/**
 * Programmatic state-page data: content templates, related-state
 * navigation, and shared example-calculation constants.
 */
export { getStatePageContent, FEDERAL_TAX_SECTION } from "./content.ts";
export type { StatePageContent, StateFaq } from "./content.ts";
export { getRelatedSlugs, RELATED_STATES } from "./related.ts";

/** Jackpot sizes used for the on-page example tables. */
export const EXAMPLE_JACKPOTS = [1_000_000, 10_000_000, 100_000_000] as const;

/**
 * Illustrative cash-value assumption for examples (cash ≈ 48% of the
 * advertised jackpot). This is NOT a universal lottery rule — every
 * rendered example labels it as an assumption.
 */
export const EXAMPLE_CASH_VALUE_RATIO = 0.48;
