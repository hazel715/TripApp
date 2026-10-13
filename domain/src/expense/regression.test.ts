import { describe, expect, it } from "vitest";
import { Money, planMinTransfers, toBurdenStatus } from "../index.ts";

function rows(values: string[]) {
  return values.map((value, index) => ({
    userId: String(index),
    balance: Money.of(value),
  }));
}

describe("settlement regression", () => {
  it("rejects a nonzero total and duplicate users", () => {
    expect(() => planMinTransfers(rows(["1", "-2"]))).toThrow(/total/);
    expect(() =>
      planMinTransfers([
        { userId: "a", balance: Money.of(1) },
        { userId: "a", balance: Money.of(-1) },
      ]),
    ).toThrow(/Duplicate/);
  });
  it("finds the optimum when global largest-first greedy takes five transfers", () => {
    const input = rows(["9", "8", "3", "-8", "-7", "-5"]);
    const transfers = planMinTransfers(input);
    expect(transfers).toHaveLength(4);
    const residual = new Map(input.map((row) => [row.userId, row.balance]));
    for (const transfer of transfers) {
      residual.set(
        transfer.fromUserId,
        residual.get(transfer.fromUserId)!.plus(transfer.amount),
      );
      residual.set(
        transfer.toUserId,
        residual.get(transfer.toUserId)!.minus(transfer.amount),
      );
    }
    expect([...residual.values()].every((value) => value.isZero())).toBe(true);
  });
  it("matches exhaustive zero-partition search for small decimal ledgers", () => {
    function maxGroups(values: number[]): number {
      if (!values.length) return 0;
      let best = 0;
      for (let mask = 1; mask < 1 << values.length; mask += 2) {
        const group = values.filter((_, i) => mask & (1 << i));
        if (group.reduce((sum, v) => sum + v, 0) === 0) {
          best = Math.max(
            best,
            1 + maxGroups(values.filter((_, i) => !(mask & (1 << i)))),
          );
        }
      }
      return best;
    }
    for (let seed = 1; seed <= 40; seed++) {
      const values = Array.from(
        { length: 5 },
        (_, i) => ((seed * (i + 3)) % 11) - 5,
      );
      values.push(-values.reduce((sum, v) => sum + v, 0));
      const nonzero = values.filter((v) => v !== 0);
      const inputs = rows(nonzero.map((v) => (v / 10000).toFixed(4)));
      expect(planMinTransfers(inputs)).toHaveLength(
        nonzero.length - maxGroups(nonzero),
      );
    }
  });
  it("does not combine currencies", () => {
    expect(toBurdenStatus([], ["a"], "KRW").rows[0].difference.isZero()).toBe(
      true,
    );
  });
});

it("refuses unsupported group sizes explicitly rather than returning a greedy plan", () => {
  const values = ["20", ...Array.from({ length: 20 }, () => "-1")];
  expect(() => planMinTransfers(rows(values))).toThrow(/at most 20/);
});
