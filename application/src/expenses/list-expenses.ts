import { requireMember, type ExpenseRepository, type ProjectRepository, type User } from "@tripapp/domain";

export async function listExpensesUseCase(
  deps: { projects: ProjectRepository; expenses: ExpenseRepository },
  actor: User,
  projectId: string,
) {
  const project = await deps.projects.findById(projectId);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  requireMember(project, actor.id);
  return deps.expenses.listByProject(projectId);
}
