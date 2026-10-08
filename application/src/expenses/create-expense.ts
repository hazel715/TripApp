import {
  assembleExpense,
  Money,
  reopenProjectIfClosed,
  requireMember,
  splitSettlementAmount,
  type CategoryRepository,
  type Expense,
  type ExpenseRepository,
  type ProjectRepository,
  type UnitOfWork,
  type User,
} from "@tripapp/domain";
import type { ChangeNotifier, Clock, IdGenerator } from "../ports.ts";

export type ExpenseInput = {
  projectId: string;
  payerUserId: string;
  categoryId?: string | null;
  description: string;
  amount: string;
  currency: string;
  fxRate?: string | null;
  settlementAmount: string;
  settlementCurrency: string;
  expenseDate?: string | null;
  shares?: { userId: string; shareAmount: string }[];
  participantUserIds?: string[];
};

export type ExpenseWriteDeps = {
  projects: ProjectRepository;
  expenses: ExpenseRepository;
  categories: CategoryRepository;
  uow: UnitOfWork;
  clock: Clock;
  ids: IdGenerator;
  notifier: ChangeNotifier;
};

export async function createExpenseUseCase(
  deps: ExpenseWriteDeps,
  actor: User,
  input: ExpenseInput,
): Promise<Expense> {
  const created = await deps.uow.run(async () => {
    const project = await deps.projects.findById(input.projectId);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    requireMember(project, actor.id);

    if (input.categoryId) {
      const category = await deps.categories.findById(input.categoryId);
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
    }

    const now = deps.clock.now();
    const shares =
      input.shares ??
      splitSettlementAmount(Money.of(input.settlementAmount), input.participantUserIds ?? []).map(
        (s) => ({ userId: s.userId, shareAmount: s.shareAmount.toString() }),
      );

    const expense = assembleExpense(
      {
        id: deps.ids.next(),
        projectId: project.id,
        payerUserId: input.payerUserId,
        categoryId: input.categoryId ?? null,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        fxRate: input.fxRate ?? null,
        settlementAmount: input.settlementAmount,
        settlementCurrency: input.settlementCurrency,
        expenseDate: input.expenseDate ?? null,
        shares,
        createdAt: now,
        updatedAt: now,
      },
      project,
    );

    await deps.expenses.save(expense);
    await deps.projects.save(reopenProjectIfClosed(project, now));
    return expense;
  });

  await deps.notifier.notify({
    projectId: created.projectId,
    resource: "expense",
    action: "created",
  });
  return created;
}
