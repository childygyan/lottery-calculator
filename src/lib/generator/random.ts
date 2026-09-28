/**
 * Random-number sources for the lottery number generator.
 *
 * Randomness is injected through the `RandomSource` interface so unit tests
 * can use a deterministic source instead of statistically testing randomness.
 * Production code always uses `cryptoRandomSource()`, which prefers
 * `crypto.getRandomValues()` and only falls back to `Math.random()` when no
 * cryptographic source exists (documented as degraded).
 */

export interface RandomSource {
  /**
   * Return a uniformly distributed integer in [0, bound).
   * Must throw for non-positive or non-integer bounds.
   */
  nextInt(bound: number): number;
}

/** Upper bound for rejection sampling (2^32 - 1, from a Uint32). */
const UINT32_MAX = 0xffffffff;

/**
 * Cryptographically-backed random source.
 *
 * Uses rejection sampling on 32-bit values so the result is uniform in
 * [0, bound) with no modulo bias.
 */
export function cryptoRandomSource(): RandomSource {
  return {
    nextInt(bound: number): number {
      if (!Number.isInteger(bound) || bound <= 0) {
        throw new Error(`nextInt bound must be a positive integer, got ${bound}.`);
      }
      const cryptoObj =
        typeof globalThis !== "undefined"
          ? (globalThis as { crypto?: Crypto }).crypto
          : undefined;
      if (cryptoObj?.getRandomValues) {
        // Largest multiple of `bound` that fits in a Uint32; values at or
        // above it are redrawn so the remainder stays uniform.
        const limit = UINT32_MAX - (UINT32_MAX % bound);
        const buf = new Uint32Array(1);
        let v = 0;
        do {
          cryptoObj.getRandomValues(buf);
          v = buf[0] ?? 0;
        } while (v >= limit);
        return v % bound;
      }
      // Degraded fallback: only reached where WebCrypto is unavailable.
      return Math.floor(Math.random() * bound);
    },
  };
}

/**
 * Deterministic source for tests: cycles through `values`, using each as
 * `value % bound`. Never use for real generation.
 */
export function sequenceRandomSource(values: number[]): RandomSource {
  if (values.length === 0) {
    throw new Error("sequenceRandomSource needs at least one value.");
  }
  let i = 0;
  return {
    nextInt(bound: number): number {
      if (!Number.isInteger(bound) || bound <= 0) {
        throw new Error(`nextInt bound must be a positive integer, got ${bound}.`);
      }
      const v = values[i % values.length] ?? 0;
      i += 1;
      return ((v % bound) + bound) % bound;
    },
  };
}
