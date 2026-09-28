/**
 * Central source registry.
 *
 * Every tax rule references a source by id instead of duplicating raw URLs
 * across data files. URLs are included only when verified; otherwise the
 * entry names the publication so it can be found (url: null).
 */

export interface SourceRef {
  id: string;
  name: string;
  publisher: string;
  /** Verified URL, or null when the exact address is not confirmed. */
  url: string | null;
  lastChecked: string;
  description: string;
}

export const SOURCES: Record<string, SourceRef> = {
  "irs-rev-proc-2025-32": {
    id: "irs-rev-proc-2025-32",
    name: "IRS Revenue Procedure 2025-32",
    publisher: "Internal Revenue Service",
    url: null,
    lastChecked: "2026-09-28",
    description:
      "Annual inflation adjustments for tax year 2026: federal income tax brackets by filing status and standard deduction amounts. Announced October 2025; applies to returns filed in 2027.",
  },
  "irs-gambling-withholding": {
    id: "irs-gambling-withholding",
    name: "IRS guidance on withholding for gambling winnings",
    publisher: "Internal Revenue Service",
    url: null,
    lastChecked: "2026-09-28",
    description:
      "Federal income tax withholding at 24% on gambling and lottery winnings over $5,000. Withholding is credited against the winner's final tax liability; it is not the final tax.",
  },
  "tax-foundation-state-2026": {
    id: "tax-foundation-state-2026",
    name: "State Individual Income Tax Rates and Brackets, 2026",
    publisher: "Tax Foundation",
    url: "https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/",
    lastChecked: "2026-09-28",
    description:
      "State individual income tax rates and brackets as of January 1, 2026 (data current as of February 11, 2026). Used for top-marginal-rate planning estimates.",
  },
  "ca-lottery-exemption": {
    id: "ca-lottery-exemption",
    name: "California Lottery winnings exemption",
    publisher: "State of California (Franchise Tax Board / California Lottery)",
    url: "https://www.calottery.com",
    lastChecked: "2026-09-28",
    description:
      "California exempts California Lottery winnings from state individual income tax. Federal tax still applies.",
  },
  "wa-no-income-tax": {
    id: "wa-no-income-tax",
    name: "Washington State Department of Revenue guidance",
    publisher: "Washington State Department of Revenue",
    url: null,
    lastChecked: "2026-09-28",
    description:
      "Washington levies no individual income tax on wage or lottery income. Its capital-gains excise tax applies only to capital gains of high earners, not lottery winnings.",
  },
  "nh-no-income-tax": {
    id: "nh-no-income-tax",
    name: "New Hampshire Department of Revenue Administration",
    publisher: "State of New Hampshire",
    url: null,
    lastChecked: "2026-09-28",
    description:
      "New Hampshire repealed its interest and dividends tax effective 2025 and levies no broad individual income tax.",
  },
  "wv-sb392-unverified": {
    id: "wv-sb392-unverified",
    name: "West Virginia SB 392 (2026 session) — unverified",
    publisher: "West Virginia Legislature",
    url: null,
    lastChecked: "2026-09-28",
    description:
      "Reports indicate a further 5% across-the-board income tax rate reduction retroactive to January 1, 2026, but passage and final rates are not confirmed against an authoritative source. The calculator uses the Tax Foundation's published 2026 rates and flags West Virginia as needing verification.",
  },
};

/** Look up a source by id. Returns undefined for unknown ids — never throws. */
export function getSource(id: string): SourceRef | undefined {
  return SOURCES[id];
}
