import { reopenProjectIfClosed, requireMember, type User } from "@tripapp/domain";
import type { ExpenseWriteDeps } from "./create-expense.ts";

export async function deleteExpenseUseCase(
  deps: ExpenseWriteDeps,
  actor: User,
  input: { projectId: string; expenseId: string },
): Promise<void> {
  await deps.uow.run(async () => {
    const project = await deps.projects.findById(input.projectId);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    requireMember(project, actor.id);
    const existing = await deps.expenses.findById(input.expenseId);
    if (!existing || existing.projectId !== project.id) {
      throw new Error("EXPENSE_NOT_FOUND");
    }
    await deps.expenses.delete(existing.id);
    await deps.projects.save(reopenProjectIfClosed(project, deps.clock.now()));
  });
  await deps.notifier.notify({
    projectId: input.projectId,
    resource: "expense",
    action: "deleted",
  });
}
