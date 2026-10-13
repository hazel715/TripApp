import { describe, expect, it } from "vitest";
import { equalShares } from "./money.ts";
import { Decimal } from "decimal.js";
describe("share form", () => {
  it("conserves positive and negative decimal totals", () => {
    for (const total of ["100", "-100", "0.0001"]) {
      const shares = equalShares(total, ["a", "b", "c"]);
      expect(
        shares
          .reduce((sum, s) => sum.plus(s.shareAmount), new Decimal(0))
          .eq(total),
      ).toBe(true);
    }
  });
  it("deduplicates participants", () => {
    expect(equalShares("10", ["a", "a"])).toHaveLength(1);
  });
});
