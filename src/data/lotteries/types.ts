/**
 * Generic lottery game configuration model.
 *
 * Every game-specific rule (number pools, ticket price, prize tiers, odds,
 * multipliers, jackpot structure) lives in a LotteryConfig. UI components
 * and the calculation engine consume the config — they never hard-code
 * Powerball or Mega Millions rules.
 *
 * Rule versioning: lottery rules change over time, so each config carries
 * a version, an effectiveDate, and an expirationDate (null while current).
 * `lastVerified` records when the rules were last checked against an
 * authoritative source. Never invent values: anything that cannot be
 * verified is left out of the config and out of the UI.
 */

export interface NumberRange {
  min: number;
  max: number;
}

export interface PrizeTier {
  /** Human-readable match description, e.g. "5 + Powerball". */
  matchPattern: string;
  /** Fixed prize in USD, or "jackpot" for the top tier. */
  basePrize: number | "jackpot";
  /** 1-in-N odds of hitting this tier. */
  odds: number;
  /** Whether a multiplier add-on can increase this prize. */
  multiplierApplicable?: boolean;
  /**
   * For games with a built-in multiplier (Mega Millions): the prize at each
   * multiplier level, keyed by multiplier, e.g. { "2": 2000000, ... }.
   * When present, the UI renders multiplier columns instead of basePrize.
   */
  prizeByMultiplier?: Record<string, number>;
}

export interface MultiplierRule {
  /** Display name, e.g. "Power Play". */
  name: string;
  /** How the multiplier is obtained, e.g. "+$1 per play" / "Included in the ticket price". */
  costDescription: string;
  /** Available multiplier values, e.g. [2, 3, 4, 5, 10]. */
  multipliers: number[];
  /** Whether the multiplier can apply to the jackpot (usually false). */
  appliesToJackpot: boolean;
  /** Extra verified details, e.g. conditional availability. */
  notes?: string;
}

/** Payment frequency for an annuity schedule. */
export type AnnuityFrequency = "annual" | "monthly";

/**
 * Structured annuity rules for a lottery game.
 *
 * Never invent what isn't published: when the official rules describe
 * graduated payments without a fixed rate, growthRate stays null and the
 * UI lets the user enter the annual increase themselves.
 */
export interface AnnuityConfig {
  /** Total number of payments, e.g. 30. */
  numberOfPayments: number;
  paymentFrequency: AnnuityFrequency;
  /**
   * Per-period growth as a decimal (e.g. 0.05 = each payment 5% larger than
   * the previous one). Null when the official rules do not publish a fixed
   * graduation rate.
   */
  growthRate: number | null;
  /** Verified description of when the first payment arrives, if published. */
  firstPaymentDescription?: string;
  /** Verified notes, e.g. "graduated payments" when no fixed rate is published. */
  notes?: string;
}

export interface LotterySourceRef {
  /** Id in the central source registry (src/data/sources.ts). */
  sourceId: string;
  /** Human-readable source name for display. */
  sourceName: string;
}

export interface LotteryConfig {
  /** Stable id, e.g. "powerball". */
  id: string;
  /** Display name, e.g. "Powerball". */
  name: string;
  /** Route slug for the calculator page, e.g. "powerball-calculator". */
  slug: string;

  // -- Rule versioning --
  /** Config version label, e.g. "2026". */
  version: string;
  /** ISO date the rules in this config were verified as current. */
  effectiveDate: string;
  /** ISO date the rules stopped applying, or null while current. */
  expirationDate: string | null;
  /** ISO date the rules were last checked against an authoritative source. */
  lastVerified: string;

  // -- Game structure --
  /** Count of main numbers drawn, e.g. 5. */
  mainNumbers: number;
  mainNumberRange: NumberRange;
  /** Display name for the main balls, e.g. "white balls". */
  mainBallName: string;
  /** Display name for the bonus ball, e.g. "Powerball". */
  bonusNumberName: string;
  bonusNumberRange: NumberRange;

  /** Ticket price in USD per play. */
  ticketPrice: number;
  /** Draw schedule, e.g. "Monday, Wednesday, Saturday". */
  drawDays: string;
  /** Draw time, e.g. "10:59 p.m. ET". */
  drawTime: string;

  // -- Jackpot --
  /** 1-in-N odds of winning the jackpot. */
  jackpotOdds: number;
  /** 1-in-N odds of winning any prize (may be fractional, e.g. 24.87). */
  anyPrizeOdds: number;
  /** Advertised starting jackpot in USD. */
  startingJackpot: number;
  /** Plain-language description of the annuity option. */
  annuityDescription: string;

  // -- Prizes --
  prizeTiers: PrizeTier[];
  /** Multiplier add-on rules, or null when the game has none. */
  multiplier: MultiplierRule | null;

  // -- Annuity --
  /**
   * Structured annuity rules, or null when the exact payment schedule is
   * not published. The calculator falls back to user-entered parameters
   * rather than inventing a schedule.
   */
  annuity: AnnuityConfig | null;

  // -- Provenance --
  officialSource: LotterySourceRef;
}

/**
 * Validate a lottery configuration. Returns a list of problems; an empty
 * list means the config is usable. The engine refuses to calculate with an
 * invalid config instead of guessing.
 */
export function validateLotteryConfig(config: LotteryConfig): string[] {
  const problems: string[] = [];
  const fail = (msg: string) => problems.push(`${config.id || "(unknown)"}: ${msg}`);

  if (!config.id.trim()) fail("id is required.");
  if (!config.name.trim()) fail("name is required.");
  if (!config.slug.trim()) fail("slug is required.");
  if (!config.version.trim()) fail("version is required.");
  if (!config.effectiveDate.trim()) fail("effectiveDate is required.");
  if (!config.lastVerified.trim()) fail("lastVerified is required.");
  if (
    config.expirationDate !== null &&
    config.expirationDate <= config.effectiveDate
  ) {
    fail("expirationDate must be after effectiveDate.");
  }

  if (!Number.isInteger(config.mainNumbers) || config.mainNumbers <= 0) {
    fail("mainNumbers must be a positive integer.");
  }
  for (const [label, range] of [
    ["mainNumberRange", config.mainNumberRange],
    ["bonusNumberRange", config.bonusNumberRange],
  ] as const) {
    if (
      !range ||
      !Number.isInteger(range.min) ||
      !Number.isInteger(range.max) ||
      range.min < 1 ||
      range.max <= range.min
    ) {
      fail(`${label} must be a valid range with min >= 1 and max > min.`);
    }
  }
  if (!config.mainBallName.trim()) fail("mainBallName is required.");
  if (!config.bonusNumberName.trim()) fail("bonusNumberName is required.");

  if (!(config.ticketPrice > 0)) fail("ticketPrice must be positive.");
  if (!config.drawDays.trim()) fail("drawDays is required.");
  if (!config.drawTime.trim()) fail("drawTime is required.");

  if (!(config.jackpotOdds > 0)) fail("jackpotOdds must be positive.");
  if (!(config.anyPrizeOdds > 0)) fail("anyPrizeOdds must be positive.");
  if (!(config.startingJackpot > 0)) fail("startingJackpot must be positive.");
  if (!config.annuityDescription.trim()) fail("annuityDescription is required.");

  if (!Array.isArray(config.prizeTiers) || config.prizeTiers.length === 0) {
    fail("prizeTiers must be a non-empty list.");
  } else {
    const [top, ...rest] = config.prizeTiers;
    if (!top || top.basePrize !== "jackpot") {
      fail("the first prize tier must be the jackpot tier.");
    }
    config.prizeTiers.forEach((tier, i) => {
      if (!tier.matchPattern.trim()) fail(`prizeTiers[${i}]: matchPattern is required.`);
      if (!(tier.odds > 0)) fail(`prizeTiers[${i}]: odds must be positive.`);
      if (tier.basePrize !== "jackpot" && !(tier.basePrize > 0)) {
        fail(`prizeTiers[${i}]: basePrize must be positive or "jackpot".`);
      }
      if (tier.prizeByMultiplier) {
        for (const [mult, prize] of Object.entries(tier.prizeByMultiplier)) {
          if (!(Number(prize) > 0)) {
            fail(`prizeTiers[${i}]: prizeByMultiplier[${mult}] must be positive.`);
          }
        }
      }
    });
    if (rest.some((t) => t.basePrize === "jackpot")) {
      fail("only the first prize tier may be the jackpot tier.");
    }
  }

  if (config.multiplier) {
    const m = config.multiplier;
    if (!m.name.trim()) fail("multiplier.name is required.");
    if (!m.costDescription.trim()) fail("multiplier.costDescription is required.");
    if (!Array.isArray(m.multipliers) || m.multipliers.length === 0) {
      fail("multiplier.multipliers must be a non-empty list.");
    }
  }

  if (config.annuity) {
    const a = config.annuity;
    if (!Number.isInteger(a.numberOfPayments) || a.numberOfPayments <= 0) {
      fail("annuity.numberOfPayments must be a positive integer.");
    }
    if (a.numberOfPayments > 600) {
      fail("annuity.numberOfPayments is unrealistically large.");
    }
    if (a.paymentFrequency !== "annual" && a.paymentFrequency !== "monthly") {
      fail('annuity.paymentFrequency must be "annual" or "monthly".');
    }
    if (a.growthRate !== null && (!(a.growthRate >= 0) || a.growthRate >= 1)) {
      fail("annuity.growthRate must be null or a decimal in [0, 1).");
    }
  }

  if (!config.officialSource?.sourceId.trim()) fail("officialSource.sourceId is required.");
  if (!config.officialSource?.sourceName.trim()) fail("officialSource.sourceName is required.");

  return problems;
}

/** Format "1 in N" odds, keeping official decimal precision (e.g. 24.87). */
export function formatOdds(oneInN: number): string {
  const formatted = Number.isInteger(oneInN)
    ? oneInN.toLocaleString("en-US")
    : oneInN.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `1 in ${formatted}`;
}
