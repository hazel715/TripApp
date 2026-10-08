import { describe, expect, it } from "vitest";
import { Money } from "../shared/money.ts";
import { createProject } from "../project/project.ts";
import { assembleExpense, type Expense } from "./expense.ts";
import {
  assertBalancesSumToZero,
  computeFinalSettlement,
  planMinTransfers,
  toBurdenStatus,
} from "./settlement-calc.ts";

function baseProject() {
  const now = new Date("2026-01-01T00:00:00Z");
  const p = createProject({
    id: "p1",
    name: "Trip",
    defaultExpenseCurrency: "KRW",
    settlementCurrency: "KRW",
    ownerUserId: "minsu",
    ownerDisplayName: "민수",
    now,
  });
  p.members.push(
    { projectId: "p1", userId: "chulsoo", role: "member", displayName: "철수" },
    { projectId: "p1", userId: "younghee", role: "member", displayName: "영희" },
    { projectId: "p1", userId: "jisu", role: "member", displayName: "지수" },
  );
  return p;
}

function exp(input: {
  id: string;
  payer: string;
  settlement: string;
  shares: Record<string, string>;
}): Expense {
  const project = baseProject();
  return assembleExpense(
    {
      id: input.id,
      projectId: "p1",
      payerUserId: input.payer,
      categoryId: null,
      description: input.id,
      amount: input.settlement,
      currency: "KRW",
      fxRate: null,
      settlementAmount: input.settlement,
      settlementCurrency: "KRW",
      expenseDate: "2026-10-08",
      shares: Object.entries(input.shares).map(([userId, shareAmount]) => ({
        userId,
        shareAmount,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    project,
  );
}

describe("current burden status", () => {
  it("shows paid, share total, and difference without transfers", () => {
    const expenses = [
      exp({
        id: "e1",
        payer: "minsu",
        settlement: "360000",
        shares: { minsu: "164000", chulsoo: "82000", younghee: "114000" },
      }),
      exp({
        id: "e2",
        payer: "chulsoo",
        settlement: "72000",
        shares: { chulsoo: "72000" },
      }),
    ];
    const status = toBurdenStatus(expenses, ["minsu", "chulsoo", "younghee"], "KRW");
    const minsu = status.rows.find((r) => r.userId === "minsu")!;
    expect(minsu.paid.toString()).toBe("360000");
    expect(minsu.shareTotal.toString()).toBe("164000");
    expect(minsu.difference.toString()).toBe("196000");
    const chulsoo = status.rows.find((r) => r.userId === "chulsoo")!;
    expect(chulsoo.paid.toString()).toBe("72000");
    expect(chulsoo.shareTotal.toString()).toBe("154000");
    expect(chulsoo.difference.toString()).toBe("-82000");
    assertBalancesSumToZero(status.rows);
  });

  it("handles negative expense and share", () => {
    const expenses = [
      exp({
        id: "e1",
        payer: "minsu",
        settlement: "100000",
        shares: { minsu: "50000", chulsoo: "50000" },
      }),
      exp({
        id: "e2",
        payer: "minsu",
        settlement: "-30000",
        shares: { chulsoo: "-30000" },
      }),
    ];
    const status = toBurdenStatus(expenses, ["minsu", "chulsoo"], "KRW");
    assertBalancesSumToZero(status.rows);
    const chulsoo = status.rows.find((r) => r.userId === "chulsoo")!;
    expect(chulsoo.shareTotal.toString()).toBe("20000");
  });
});

describe("planMinTransfers", () => {
  it("computes a single pair", () => {
    const transfers = planMinTransfers([
      { userId: "a", balance: Money.of("10000") },
      { userId: "b", balance: Money.of("-10000") },
    ]);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({ fromUserId: "b", toUserId: "a" });
    expect(transfers[0].amount.toString()).toBe("10000");
  });

  it("uses two independent pairs instead of chaining (already offset users)", () => {
    const transfers = planMinTransfers([
      { userId: "a", balance: Money.of("10") },
      { userId: "b", balance: Money.of("-10") },
      { userId: "c", balance: Money.of("5") },
      { userId: "d", balance: Money.of("-5") },
    ]);
    expect(transfers).toHaveLength(2);
  });

  it("handles multiple creditors and debtors", () => {
    const transfers = planMinTransfers([
      { userId: "minsu", balance: Money.of("196000") },
      { userId: "chulsoo", balance: Money.of("-10000") },
      { userId: "younghee", balance: Money.of("-84000") },
      { userId: "jisu", balance: Money.of("-102000") },
    ]);
    expect(transfers).toHaveLength(3);
    const total = transfers.reduce((acc, t) => acc.plus(t.amount), Money.zero());
    expect(total.toString()).toBe("196000");
    expect(transfers.every((t) => t.toUserId === "minsu")).toBe(true);
  });

  it("returns empty when everyone is already offset", () => {
    expect(
      planMinTransfers([
        { userId: "a", balance: Money.of("0") },
        { userId: "b", balance: Money.of("0") },
      ]),
    ).toEqual([]);
  });
});

describe("computeFinalSettlement", () => {
  it("returns positive and negative balances and min transfers", () => {
    const expenses = [
      exp({
        id: "e1",
        payer: "minsu",
        settlement: "30000",
        shares: { minsu: "10000", chulsoo: "10000", younghee: "10000" },
      }),
    ];
    const result = computeFinalSettlement(expenses, ["minsu", "chulsoo", "younghee"], "KRW");
    const minsu = result.balances.find((b) => b.userId === "minsu")!;
    expect(minsu.balance.toString()).toBe("20000");
    expect(result.transfers).toHaveLength(2);
  });
});
