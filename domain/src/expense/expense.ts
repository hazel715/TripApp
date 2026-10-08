import Decimal from "decimal.js";
import { DomainError } from "../shared/errors.ts";
import { assertCurrencyCode } from "../shared/currency.ts";
import { parseFxRate, type FxRate } from "../shared/fx-rate.ts";
import { assertNonZero, Money } from "../shared/money.ts";
import type { ExpenseShare } from "./expense-share.ts";
import type { Project } from "../project/project.ts";
import { findMember } from "../project/project.ts";

export type Expense = {
  id: string;
  projectId: string;
  payerUserId: string;
  categoryId: string | null;
  description: string;
  amount: Money;
  currency: string;
  fxRate: FxRate | null;
  settlementAmount: Money;
  settlementCurrency: string;
  expenseDate: string | null;
  shares: ExpenseShare[];
  createdAt: Date;
  updatedAt: Date;
};

export type ExpenseDraft = {
  id: string;
  projectId: string;
  payerUserId: string;
  categoryId: string | null;
  description: string;
  amount: string;
  currency: string;
  fxRate: string | null;
  settlementAmount: string;
  settlementCurrency: string;
  expenseDate: string | null;
  shares: { userId: string; shareAmount: string }[];
  createdAt: Date;
  updatedAt: Date;
};

export function assembleExpense(draft: ExpenseDraft, project: Project): Expense {
  const description = draft.description.trim();
  if (!description) {
    throw new DomainError("INVALID_EXPENSE", "Description is required");
  }
  const amount = Money.of(draft.amount);
  const settlementAmount = Money.of(draft.settlementAmount);
  assertNonZero(amount, "amount");
  assertNonZero(settlementAmount, "settlement_amount");

  const currency = assertCurrencyCode(draft.currency);
  const settlementCurrency = assertCurrencyCode(draft.settlementCurrency);
  const fxRate = parseFxRate(draft.fxRate);

  if (currency === settlementCurrency && fxRate !== null && !fxRate.eq(1)) {
    // Allowed: user may still store 1 or omit. Non-1 is odd but not forbidden.
  }
  if (currency !== settlementCurrency && fxRate === null) {
    throw new DomainError(
      "FX_RATE_REQUIRED",
      "fx_rate is required when expense currency differs from settlement currency",
    );
  }

  if (draft.expenseDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(draft.expenseDate)) {
    throw new DomainError("INVALID_DATE", "expense_date must be YYYY-MM-DD or null");
  }

  if (!findMember(project, draft.payerUserId)) {
    throw new DomainError("PAYER_NOT_MEMBER", "Payer must be a project member");
  }

  if (draft.shares.length === 0) {
    throw new DomainError("SHARES_REQUIRED", "At least one share is required");
  }

  const seen = new Set<string>();
  const shares: ExpenseShare[] = draft.shares.map((row) => {
    if (seen.has(row.userId)) {
      throw new DomainError("DUPLICATE_SHARE", "Each user can appear in shares only once");
    }
    seen.add(row.userId);
    if (!findMember(project, row.userId)) {
      throw new DomainError("SHARE_USER_NOT_MEMBER", "Share user must be a project member");
    }
    const shareAmount = Money.of(row.shareAmount);
    assertNonZero(shareAmount, "share_amount");
    return { userId: row.userId, shareAmount };
  });

  const expense: Expense = {
    id: draft.id,
    projectId: draft.projectId,
    payerUserId: draft.payerUserId,
    categoryId: draft.categoryId,
    description,
    amount,
    currency,
    fxRate,
    settlementAmount,
    settlementCurrency,
    expenseDate: draft.expenseDate,
    shares,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
  assertSharesMatchSettlement(expense);
  return expense;
}

export function assertSharesMatchSettlement(expense: Expense): void {
  const sum = expense.shares.reduce(
    (acc, share) => acc.plus(share.shareAmount.value),
    new Decimal(0),
  );
  if (!sum.eq(expense.settlementAmount.value)) {
    throw new DomainError(
      "SHARE_SUM_MISMATCH",
      `Sum of shares (${sum.toString()}) must equal settlement_amount (${expense.settlementAmount.toString()})`,
    );
  }
}

export function splitSettlementAmount(
  total: Money,
  userIds: string[],
): ExpenseShare[] {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) {
    throw new DomainError("SHARES_REQUIRED", "At least one participant is required");
  }
  const n = unique.length;
  const unit = Money.of(total.value.div(n).toDecimalPlaces(4, Decimal.ROUND_DOWN));
  const shares: ExpenseShare[] = unique.map((userId) => ({
    userId,
    shareAmount: unit,
  }));
  const assigned = unit.value.times(n);
  const remainder = total.value.minus(assigned);
  shares[0] = {
    userId: shares[0].userId,
    shareAmount: Money.of(shares[0].shareAmount.value.plus(remainder)),
  };
  return shares.filter((share) => !share.shareAmount.isZero());
}
