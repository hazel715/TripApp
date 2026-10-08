import {
  computeFinalSettlement,
  requireMember,
  toBurdenStatus,
  type ExpenseRepository,
  type Project,
  type ProjectRepository,
  type User,
} from "@tripapp/domain";

export async function getProjectUseCase(
  deps: { projects: ProjectRepository; expenses: ExpenseRepository },
  actor: User,
  projectId: string,
): Promise<Project> {
  const project = await deps.projects.findById(projectId);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  requireMember(project, actor.id);
  return project;
}

export async function getProjectBalancesUseCase(
  deps: { projects: ProjectRepository; expenses: ExpenseRepository },
  actor: User,
  projectId: string,
) {
  const project = await getProjectUseCase(deps, actor, projectId);
  const expenses = await deps.expenses.listByProject(projectId);
  return toBurdenStatus(
    expenses,
    project.members.map((m) => m.userId),
    project.settlementCurrency,
  );
}

export async function getFinalSettlementUseCase(
  deps: { projects: ProjectRepository; expenses: ExpenseRepository },
  actor: User,
  projectId: string,
) {
  const project = await getProjectUseCase(deps, actor, projectId);
  const expenses = await deps.expenses.listByProject(projectId);
  return computeFinalSettlement(
    expenses,
    project.members.map((m) => m.userId),
    project.settlementCurrency,
  );
}
