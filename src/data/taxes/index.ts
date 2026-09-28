/**
 * Central entry point for tax configuration.
 * UI and calculator code import from here — never from year files directly.
 */
export { SUPPORTED_TAX_YEARS, DEFAULT_TAX_YEAR, isSupportedTaxYear, getFederalTaxRule } from "./federal/index.ts";
export type { FederalTaxRule } from "../../lib/calculator/types.ts";
export {
  isSupportedStateTaxYear,
  getStateTaxRules,
  getStateTaxRule,
  getStateOptions,
  getStatePageContexts,
} from "./states/index.ts";
export type { StateTaxRule } from "../../lib/calculator/types.ts";
export type { StatePageContext } from "./states/index.ts";
export { SOURCES, getSource } from "../sources.ts";
export type { SourceRef } from "../sources.ts";
