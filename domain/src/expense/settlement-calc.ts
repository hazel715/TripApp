import Decimal from "decimal.js";
import { Money } from "../shared/money.ts";
import type { Expense } from "./expense.ts";

export type BurdenRow = {
  userId: string;
  paid: Money;
  shareTotal: Money;
  difference: Money;
};

export type Transfer = {
  fromUserId: string;
  toUserId: string;
  amount: Money;
};

export type BurdenStatus = {
  currency: string;
  rows: BurdenRow[];
};

export type FinalSettlement = {
  currency: string;
  balances: { userId: string; balance: Money }[];
  transfers: Transfer[];
};

function collectUserIds(expenses: Expense[]): string[] {
  const ids = new Set<string>();
  for (const expense of expenses) {
    ids.add(expense.payerUserId);
    for (const share of expense.shares) {
      ids.add(share.userId);
    }
  }
  return [...ids];
}

export function accumulateBurden(
  expenses: Expense[],
  memberUserIds: string[],
): Map<string, { paid: Decimal; shareTotal: Decimal }> {
  const ids = new Set([...memberUserIds, ...collectUserIds(expenses)]);
  const map = new Map<string, { paid: Decimal; shareTotal: Decimal }>();
  for (const id of ids) {
    map.set(id, { paid: new Decimal(0), shareTotal: new Decimal(0) });
  }
  for (const expense of expenses) {
    const payer = map.get(expense.payerUserId) ?? {
      paid: new Decimal(0),
      shareTotal: new Decimal(0),
    };
    payer.paid = payer.paid.plus(expense.settlementAmount.value);
    map.set(expense.payerUserId, payer);
    for (const share of expense.shares) {
      const row = map.get(share.userId) ?? {
        paid: new Decimal(0),
        shareTotal: new Decimal(0),
      };
      row.shareTotal = row.shareTotal.plus(share.shareAmount.value);
      map.set(share.userId, row);
    }
  }
  return map;
}

export function toBurdenStatus(
  expenses: Expense[],
  memberUserIds: string[],
  currency: string,
): BurdenStatus {
  const map = accumulateBurden(expenses, memberUserIds);
  const rows: BurdenRow[] = [...map.entries()].map(([userId, row]) => {
    const paid = Money.of(row.paid);
    const shareTotal = Money.of(row.shareTotal);
    return {
      userId,
      paid,
      shareTotal,
      difference: paid.minus(shareTotal),
    };
  });
  rows.sort((a, b) => a.userId.localeCompare(b.userId));
  return { currency, rows };
}

export function assertBalancesSumToZero(rows: BurdenRow[]): void {
  const sum = rows.reduce((acc, row) => acc.plus(row.difference.value), new Decimal(0));
  if (!sum.isZero()) {
    throw new Error(`Balance total must be 0, got ${sum.toString()}`);
  }
}

type Node = { userId: string; balance: Decimal };

function greedyTransfers(nodes: Node[]): Transfer[] {
  const debtors = nodes
    .filter((n) => n.balance.lt(0))
    .map((n) => ({ userId: n.userId, amt: n.balance.abs() }))
    .sort((a, b) => b.amt.cmp(a.amt));
  const creditors = nodes
    .filter((n) => n.balance.gt(0))
    .map((n) => ({ userId: n.userId, amt: n.balance }))
    .sort((a, b) => b.amt.cmp(a.amt));

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Decimal.min(debtors[i].amt, creditors[j].amt);
    if (!pay.isZero()) {
      transfers.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        amount: Money.of(pay),
      });
    }
    debtors[i].amt = debtors[i].amt.minus(pay);
    creditors[j].amt = creditors[j].amt.minus(pay);
    if (debtors[i].amt.isZero()) i += 1;
    if (creditors[j].amt.isZero()) j += 1;
  }
  return transfers;
}

function maxZeroSumGroups(balances: Decimal[]): { count: number; groups: number[] } {
  const n = balances.length;
  const size = 1 << n;
  const sums: Decimal[] = Array.from({ length: size }, () => new Decimal(0));
  for (let mask = 1; mask < size; mask += 1) {
    const bit = mask & -mask;
    const i = Math.log2(bit);
    sums[mask] = sums[mask ^ bit].plus(balances[i]);
  }

  const dp = new Array<number>(size).fill(0);
  for (let mask = 1; mask < size; mask += 1) {
    if (!sums[mask].isZero()) continue;
    dp[mask] = 1;
    for (let sub = mask; sub; sub = (sub - 1) & mask) {
      if (sums[sub].isZero() && dp[sub] + dp[mask ^ sub] > dp[mask]) {
        dp[mask] = dp[sub] + dp[mask ^ sub];
      }
    }
  }

  const groups: number[] = [];
  const reconstruct = (mask: number) => {
    if (mask === 0) return;
    if (dp[mask] <= 1) {
      groups.push(mask);
      return;
    }
    let found = false;
    for (let sub = mask; sub; sub = (sub - 1) & mask) {
      if (sub !== mask && sums[sub].isZero() && dp[sub] + dp[mask ^ sub] === dp[mask]) {
        reconstruct(sub);
        reconstruct(mask ^ sub);
        found = true;
        break;
      }
    }
    if (!found) groups.push(mask);
  };
  reconstruct(size - 1);
  return { count: dp[size - 1] || 1, groups };
}

export function planMinTransfers(
  balances: { userId: string; balance: Money }[],
): Transfer[] {
  const nodes: Node[] = balances
    .filter((row) => !row.balance.isZero())
    .map((row) => ({ userId: row.userId, balance: row.balance.value }));
  if (nodes.length === 0) return [];

  const { groups } = maxZeroSumGroups(nodes.map((n) => n.balance));
  const transfers: Transfer[] = [];
  for (const mask of groups) {
    const group: Node[] = [];
    nodes.forEach((node, index) => {
      if (mask & (1 << index)) group.push(node);
    });
    transfers.push(...greedyTransfers(group));
  }
  return transfers;
}

export function computeFinalSettlement(
  expenses: Expense[],
  memberUserIds: string[],
  currency: string,
): FinalSettlement {
  const status = toBurdenStatus(expenses, memberUserIds, currency);
  assertBalancesSumToZero(status.rows);
  const balances = status.rows.map((row) => ({
    userId: row.userId,
    balance: row.difference,
  }));
  return {
    currency,
    balances,
    transfers: planMinTransfers(balances),
  };
}
