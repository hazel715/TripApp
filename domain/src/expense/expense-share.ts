import { Money } from "../shared/money.ts";

export type ExpenseShare = {
  userId: string;
  shareAmount: Money;
};
