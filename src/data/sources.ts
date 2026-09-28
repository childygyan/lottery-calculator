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
  "powerball-official-rules": {
    id: "powerball-official-rules",
    name: "Powerball official game rules",
    publisher: "Multi-State Lottery Association (MUSL)",
    url: "https://www.powerball.com/games/home",
    lastChecked: "2026-09-28",
    description:
      "Official Powerball rules: $2 per play, 5 white balls from 1-69 plus 1 red Powerball from 1-26, drawings Monday/Wednesday/Saturday at 10:59 p.m. ET, jackpot annuity of 30 graduated payments over 29 years or lump sum, Power Play +$1 (2X-10X multipliers, 10X only at jackpots of $150M or less, Match 5 + Power Play always $2M), Double Play +$1 as a separate drawing.",
  },
  "powerball-prize-tiers": {
    id: "powerball-prize-tiers",
    name: "Powerball prize tiers and odds",
    publisher: "Multi-State Lottery Association (MUSL), corroborated by lotteryusa.com and powerball.net",
    url: "https://www.lotteryusa.com/powerball/prizes-odds",
    lastChecked: "2026-09-28",
    description:
      "Nine official prize tiers: jackpot at 1 in 292,201,338; $1M at 1 in 11,688,053.52; $50K at 1 in 913,129.18; $100 tiers at 1 in 36,525.17 / 1 in 14,494.11; $7 tiers at 1 in 579.76 / 1 in 701.33; $4 tiers at 1 in 91.98 / 1 in 38.32. Overall odds of any prize 1 in 24.87. Corroborated against multiple current sources on 2026-09-28; the advertised starting jackpot of $20M is the figure reported by current lottery coverage.",
  },
  "megamillions-official-rules": {
    id: "megamillions-official-rules",
    name: "Mega Millions official how-to-play",
    publisher: "Mega Millions Consortium",
    url: "https://www.megamillions.com/how-to-play",
    lastChecked: "2026-09-28",
    description:
      "Official Mega Millions rules: $5.00 per play with multiplier included, 5 white balls from 1-70 plus 1 gold Mega Ball from 1-24, drawings Tuesday/Friday at 11:00 p.m. ET, nine ways to win, 2X-10X multiplier randomly assigned at purchase applying to all non-jackpot prizes, annuity of one immediate payment plus 29 annual payments each 5% larger, cash option equal to all cash in the jackpot prize pool. California pays non-jackpot prizes on a pari-mutuel basis.",
  },
  "megamillions-prize-tiers": {
    id: "megamillions-prize-tiers",
    name: "Mega Millions prizes and odds table",
    publisher: "Mega Millions Consortium",
    url: "https://www.megamillions.com/how-to-play",
    lastChecked: "2026-09-28",
    description:
      "Official nine-tier prize table with per-multiplier prizes: jackpot at 1 in 290,472,336; Match 5 $2M-$10M at 1 in 12,629,232; down to Mega Ball only $10-$50 at 1 in 35. Multiplier odds: 2X 1 in 2.13, 3X 1 in 3.2, 4X 1 in 8, 5X 1 in 16, 10X 1 in 32.",
  },
};

/** Look up a source by id. Returns undefined for unknown ids — never throws. */
export function getSource(id: string): SourceRef | undefined {
  return SOURCES[id];
}
