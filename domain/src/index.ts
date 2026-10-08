export { DomainError } from "./shared/errors.ts";
export { Money, assertNonZero } from "./shared/money.ts";
export { assertCurrencyCode, type CurrencyCode } from "./shared/currency.ts";
export { parseFxRate, type FxRate, type FxQuote, type FxQuotePort } from "./shared/fx-rate.ts";

export { type User, type UserStatus, type UserRepository, normalizeEmail, isActiveUser } from "./user/user.ts";

export { type ProjectMember, type MemberRole, isOwner } from "./project/project-member.ts";
export {
  type Project,
  type ProjectStatus,
  type ProjectRepository,
  createProject,
  findMember,
  requireMember,
  requireOwner,
  addMemberToProject,
  removeMemberFromProject,
  reopenProjectIfClosed,
} from "./project/project.ts";

export { type Category, type CategoryRepository, createCategory } from "./category/category.ts";

export { type ExpenseShare } from "./expense/expense-share.ts";
export {
  type Expense,
  type ExpenseDraft,
  assembleExpense,
  assertSharesMatchSettlement,
  splitSettlementAmount,
} from "./expense/expense.ts";
export { type ExpenseRepository, type UnitOfWork } from "./expense/expense-repository.ts";
export {
  type BurdenRow,
  type BurdenStatus,
  type Transfer,
  type FinalSettlement,
  accumulateBurden,
  toBurdenStatus,
  assertBalancesSumToZero,
  planMinTransfers,
  computeFinalSettlement,
} from "./expense/settlement-calc.ts";
