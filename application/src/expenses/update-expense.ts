import {
  assembleExpense,
  reopenProjectIfClosed,
  requireMember,
  splitSettlementAmount,
  Money,
  type Expense,
  type User,
} from "@tripapp/domain";
import type { ExpenseInput, ExpenseWriteDeps } from "./create-expense.ts";

export async function updateExpenseUseCase(
  deps: ExpenseWriteDeps,
  actor: User,
  expenseId: string,
  input: Partial<ExpenseInput> & { projectId: string },
): Promise<Expense> {
  const updated = await deps.uow.run(async () => {
    const project = await deps.projects.findById(input.projectId);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    requireMember(project, actor.id);

    const existing = await deps.expenses.findById(expenseId);
    if (!existing || existing.projectId !== project.id) {
      throw new Error("EXPENSE_NOT_FOUND");
    }

    if (input.categoryId) {
      const category = await deps.categories.findById(input.categoryId);
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
    }

    const now = deps.clock.now();
    const settlementAmount = input.settlementAmount ?? existing.settlementAmount.toString();
    const shares =
      input.shares ??
      (input.participantUserIds
        ? splitSettlementAmount(Money.of(settlementAmount), input.participantUserIds).map((s) => ({
            userId: s.userId,
            shareAmount: s.shareAmount.toString(),
          }))
        : existing.shares.map((s) => ({
            userId: s.userId,
            shareAmount: s.shareAmount.toString(),
          })));

    const expense = assembleExpense(
      {
        id: existing.id,
        projectId: project.id,
        payerUserId: input.payerUserId ?? existing.payerUserId,
        categoryId: input.categoryId === undefined ? existing.categoryId : input.categoryId,
        description: input.description ?? existing.description,
        amount: input.amount ?? existing.amount.toString(),
        currency: input.currency ?? existing.currency,
        fxRate:
          input.fxRate === undefined
            ? existing.fxRate?.toString() ?? null
            : input.fxRate,
        settlementAmount,
        settlementCurrency: input.settlementCurrency ?? existing.settlementCurrency,
        expenseDate: input.expenseDate === undefined ? existing.expenseDate : input.expenseDate,
        shares,
        createdAt: existing.createdAt,
        updatedAt: now,
      },
      project,
    );

    await deps.expenses.save(expense);
    await deps.projects.save(reopenProjectIfClosed(project, now));
    return expense;
  });

  await deps.notifier.notify({
    projectId: updated.projectId,
    resource: "expense",
    action: "updated",
  });
  return updated;
}
