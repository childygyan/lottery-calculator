/**
 * Phase 7 unit tests: the lottery number generator.
 *
 * Randomness is tested through deterministic dependency injection
 * (sequenceRandomSource) — never statistically.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cryptoRandomSource,
  sequenceRandomSource,
  generateTicket,
  generateTickets,
  generatorConfigFromLotteryConfig,
  totalCombinationsFor,
  validateGeneratorConfig,
  formatGeneratedTicket,
  MAX_SETS_PER_REQUEST,
  TOO_MANY_COMBINATIONS_MESSAGE,
  type GeneratorGameConfig,
} from "../src/lib/generator/index.ts";
import { getLotteryConfig } from "../src/data/lotteries/index.ts";

const PB: GeneratorGameConfig = {
  gameName: "Powerball",
  mainNumbersToPick: 5,
  mainNumberPool: 69,
  mainBallName: "white balls",
  bonusNumbersToPick: 1,
  bonusNumberPool: 26,
  bonusNumberName: "Powerball",
  ticketPrice: 2,
};

const NO_BONUS: GeneratorGameConfig = {
  gameName: "Classic",
  mainNumbersToPick: 6,
  mainNumberPool: 49,
  mainBallName: "main numbers",
  bonusNumbersToPick: 0,
  bonusNumberPool: 0,
  bonusNumberName: "Bonus ball",
};

/** Deterministic source: LCG stream (long enough that tests never cycle it). */
function seq(): ReturnType<typeof sequenceRandomSource> {
  const values: number[] = [];
  let state = 123456789;
  for (let i = 0; i < 100_000; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    values.push(state);
  }
  return sequenceRandomSource(values);
}

describe("cryptoRandomSource", () => {
  it("returns integers in [0, bound)", () => {
    const rand = cryptoRandomSource();
    for (const bound of [1, 2, 26, 69, 1000]) {
      for (let i = 0; i < 200; i++) {
        const v = rand.nextInt(bound);
        assert.ok(Number.isInteger(v), `integer for bound ${bound}`);
        assert.ok(v >= 0 && v < bound, `range for bound ${bound}: ${v}`);
      }
    }
  });
  it("throws for invalid bounds", () => {
    const rand = cryptoRandomSource();
    for (const bad of [0, -1, 2.5, NaN]) {
      assert.throws(() => rand.nextInt(bad as number), /positive integer/);
    }
  });
});

describe("sequenceRandomSource (deterministic DI)", () => {
  it("is deterministic and cycles", () => {
    const a = sequenceRandomSource([3, 7]);
    const b = sequenceRandomSource([3, 7]);
    const va = [a.nextInt(100), a.nextInt(100), a.nextInt(100)];
    const vb = [b.nextInt(100), b.nextInt(100), b.nextInt(100)];
    assert.deepEqual(va, vb);
    assert.deepEqual(va, [3, 7, 3]);
  });
  it("reduces modulo the bound", () => {
    const r = sequenceRandomSource([70]);
    assert.equal(r.nextInt(69), 1);
  });
});

describe("generatorConfigFromLotteryConfig", () => {
  it("derives Powerball rules from the centralized config", () => {
    const game = getLotteryConfig("powerball");
    assert.ok(game);
    const c = generatorConfigFromLotteryConfig(game);
    assert.equal(c.mainNumbersToPick, 5);
    assert.equal(c.mainNumberPool, 69);
    assert.equal(c.bonusNumbersToPick, 1);
    assert.equal(c.bonusNumberPool, 26);
    assert.equal(c.bonusNumberName, "Powerball");
    assert.equal(c.ticketPrice, 2);
  });
  it("derives Mega Millions rules from the centralized config", () => {
    const game = getLotteryConfig("mega-millions");
    assert.ok(game);
    const c = generatorConfigFromLotteryConfig(game);
    assert.equal(c.mainNumbersToPick, 5);
    assert.equal(c.mainNumberPool, 70);
    assert.equal(c.bonusNumbersToPick, 1);
    assert.equal(c.bonusNumberPool, 24);
    assert.equal(c.bonusNumberName, "Mega Ball");
    assert.equal(c.ticketPrice, 5);
  });
});

describe("validateGeneratorConfig", () => {
  it("accepts valid configs", () => {
    assert.equal(validateGeneratorConfig(PB), null);
    assert.equal(validateGeneratorConfig(NO_BONUS), null);
  });
  it("rejects invalid configs", () => {
    assert.ok(validateGeneratorConfig({ ...PB, mainNumbersToPick: 70 }));
    assert.ok(validateGeneratorConfig({ ...PB, mainNumbersToPick: 0 }));
    assert.ok(validateGeneratorConfig({ ...PB, mainNumbersToPick: 2.5 }));
    assert.ok(validateGeneratorConfig({ ...PB, mainNumberPool: 0 }));
    assert.ok(validateGeneratorConfig({ ...PB, bonusNumbersToPick: 27 }));
    assert.ok(validateGeneratorConfig({ ...PB, bonusNumbersToPick: -1 }));
    assert.ok(validateGeneratorConfig({ ...PB, mainNumberPool: 10_001 }));
  });
});

describe("generateTicket", () => {
  it("produces sorted, distinct main numbers in range + a separate bonus", () => {
    const t = generateTicket(PB, seq());
    assert.equal(t.mainNumbers.length, 5);
    assert.deepEqual([...t.mainNumbers].sort((a, b) => a - b), t.mainNumbers);
    assert.equal(new Set(t.mainNumbers).size, 5);
    for (const n of t.mainNumbers) assert.ok(n >= 1 && n <= 69, `main ${n} in range`);
    assert.equal(t.bonusNumbers.length, 1);
    const b = t.bonusNumbers[0] ?? 0;
    assert.ok(b >= 1 && b <= 26, `bonus ${b} in range`);
  });
  it("supports no bonus ball", () => {
    const t = generateTicket(NO_BONUS, seq());
    assert.equal(t.mainNumbers.length, 6);
    assert.deepEqual(t.bonusNumbers, []);
  });
  it("is deterministic given a deterministic source", () => {
    const a = generateTicket(PB, sequenceRandomSource([1, 2, 3]));
    const b = generateTicket(PB, sequenceRandomSource([1, 2, 3]));
    assert.deepEqual(a, b);
  });
});

describe("generateTickets", () => {
  it("generates 1, 5, 10 and custom quantities up to 100", () => {
    for (const n of [1, 5, 10, 37, 100]) {
      const r = generateTickets(PB, n, {}, seq());
      assert.ok(r.ok, `count ${n}`);
      if (r.ok) assert.equal(r.tickets.length, n);
    }
  });
  it("rejects counts outside 1..100", () => {
    for (const bad of [0, -3, 101, 1000, 2.5]) {
      const r = generateTickets(PB, bad, {}, seq());
      assert.ok(!r.ok, `count ${bad} rejected`);
      if (!r.ok) assert.match(r.error, /between 1 and 100/);
    }
  });
  it("avoids duplicate combinations by default", () => {
    const r = generateTickets(NO_BONUS, 50, {}, seq());
    assert.ok(r.ok);
    if (r.ok) {
      const keys = r.tickets.map((t) => t.mainNumbers.join(","));
      assert.equal(new Set(keys).size, 50);
    }
  });
  it("rejects more unique sets than mathematically possible", () => {
    const tiny: GeneratorGameConfig = {
      ...NO_BONUS,
      mainNumbersToPick: 1,
      mainNumberPool: 3,
    }; // only 3 combinations exist
    const r = generateTickets(tiny, 4, {}, seq());
    assert.ok(!r.ok);
    if (!r.ok) assert.equal(r.error, TOO_MANY_COMBINATIONS_MESSAGE);
  });
  it("exact message is 'Please choose a smaller number of combinations.'", () => {
    assert.equal(
      TOO_MANY_COMBINATIONS_MESSAGE,
      "Please choose a smaller number of combinations.",
    );
  });
  it("never hangs: attempt cap bounds the worst case", () => {
    // 100 unique sets from a pool where collisions are frequent but possible.
    const r = generateTickets(NO_BONUS, 100, {}, seq());
    assert.ok(r.ok);
  });
  it("rejects invalid configs without generating", () => {
    const r = generateTickets({ ...PB, mainNumbersToPick: 70 }, 5, {}, seq());
    assert.ok(!r.ok);
  });
});

describe("totalCombinationsFor", () => {
  it("matches the Phase 6 engine: Powerball 292,201,338", () => {
    assert.equal(totalCombinationsFor(PB), 292_201_338);
  });
  it("matches the Phase 6 engine: Mega Millions 290,472,336", () => {
    const game = getLotteryConfig("mega-millions");
    assert.ok(game);
    assert.equal(totalCombinationsFor(generatorConfigFromLotteryConfig(game)), 290_472_336);
  });
  it("handles no-bonus lotteries: C(49,6) = 13,983,816", () => {
    assert.equal(totalCombinationsFor(NO_BONUS), 13_983_816);
  });
});

describe("formatGeneratedTicket", () => {
  it("formats main + bonus", () => {
    const t = { mainNumbers: [3, 12, 23, 34, 45], bonusNumbers: [10] };
    assert.equal(formatGeneratedTicket(t, PB), "3 12 23 34 45 + Powerball 10");
  });
  it("formats main only", () => {
    const t = { mainNumbers: [1, 2, 3, 4, 5, 6], bonusNumbers: [] };
    assert.equal(formatGeneratedTicket(t, NO_BONUS), "1 2 3 4 5 6");
  });
});

describe("MAX_SETS_PER_REQUEST", () => {
  it("is 100", () => {
    assert.equal(MAX_SETS_PER_REQUEST, 100);
  });
});
