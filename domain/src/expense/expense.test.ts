import { describe, expect, it } from "vitest";
import { DomainError } from "../shared/errors.ts";
import { Money } from "../shared/money.ts";
import { createProject, type Project } from "../project/project.ts";
import { assembleExpense, splitSettlementAmount } from "./expense.ts";

function project(): Project {
  const now = new Date("2026-01-01T00:00:00Z");
  const p = createProject({
    id: "p1",
    name: "Trip",
    defaultExpenseCurrency: "KRW",
    settlementCurrency: "KRW",
    ownerUserId: "u-minsu",
    ownerDisplayName: "민수",
    now,
  });
  p.members.push(
    { projectId: "p1", userId: "u-chulsoo", role: "member", displayName: "철수" },
    { projectId: "p1", userId: "u-young", role: "member", displayName: "영희" },
  );
  return p;
}

function draft(overrides: Record<string, unknown> = {}) {
  return {
    id: "e1",
    projectId: "p1",
    payerUserId: "u-minsu",
    categoryId: null,
    description: "점심",
    amount: "100000",
    currency: "KRW",
    fxRate: null,
    settlementAmount: "100000",
    settlementCurrency: "KRW",
    expenseDate: "2026-10-08",
    shares: [
      { userId: "u-minsu", shareAmount: "50000" },
      { userId: "u-chulsoo", shareAmount: "50000" },
    ],
    createdAt: new Date("2026-10-08T00:00:00Z"),
    updatedAt: new Date("2026-10-08T00:00:00Z"),
    ...overrides,
  };
}

describe("assembleExpense", () => {
  it("creates an expense when share total matches settlement amount", () => {
    const expense = assembleExpense(draft(), project());
    expect(expense.description).toBe("점심");
    expect(expense.shares).toHaveLength(2);
  });

  it("rejects share total mismatch", () => {
    expect(() =>
      assembleExpense(
        draft({
          shares: [
            { userId: "u-minsu", shareAmount: "50000" },
            { userId: "u-chulsoo", shareAmount: "40000" },
          ],
        }),
        project(),
      ),
    ).toThrow(DomainError);
  });

  it("rejects zero amount", () => {
    expect(() => assembleExpense(draft({ amount: "0", settlementAmount: "0", shares: [{ userId: "u-minsu", shareAmount: "0" }] }), project())).toThrow(
      /cannot be zero/,
    );
  });

  it("allows negative expense and matching negative shares", () => {
    const expense = assembleExpense(
      draft({
        amount: "-30000",
        settlementAmount: "-30000",
        shares: [
          { userId: "u-minsu", shareAmount: "-15000" },
          { userId: "u-chulsoo", shareAmount: "-15000" },
        ],
      }),
      project(),
    );
    expect(expense.amount.isNegative()).toBe(true);
  });

  it("allows payer who is not a share participant", () => {
    const expense = assembleExpense(
      draft({
        payerUserId: "u-minsu",
        shares: [
          { userId: "u-chulsoo", shareAmount: "50000" },
          { userId: "u-young", shareAmount: "50000" },
        ],
      }),
      project(),
    );
    expect(expense.payerUserId).toBe("u-minsu");
    expect(expense.shares.every((s) => s.userId !== "u-minsu")).toBe(true);
  });

  it("requires fx_rate when currencies differ", () => {
    expect(() =>
      assembleExpense(
        draft({
          currency: "USD",
          fxRate: null,
          settlementCurrency: "KRW",
          settlementAmount: "135000",
        }),
        project(),
      ),
    ).toThrow(/fx_rate is required/);
  });

  it("does not require amount * fx_rate to equal settlement_amount", () => {
    const expense = assembleExpense(
      draft({
        amount: "100",
        currency: "USD",
        fxRate: "1350",
        settlementAmount: "134500",
        settlementCurrency: "KRW",
        shares: [{ userId: "u-minsu", shareAmount: "134500" }],
      }),
      project(),
    );
    expect(expense.settlementAmount.toString()).toBe("134500");
  });
});

describe("splitSettlementAmount", () => {
  it("keeps the exact total", () => {
    const shares = splitSettlementAmount(Money.of("100"), ["a", "b", "c"]);
    const sum = shares.reduce((acc, s) => acc.plus(s.shareAmount), Money.zero());
    expect(sum.equals(Money.of("100"))).toBe(true);
    expect(shares.every((s) => !s.shareAmount.isZero())).toBe(true);
  });
});
