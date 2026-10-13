import {
  toBurdenStatus,
  type ProjectRepository,
  type ExpenseRepository,
  type User,
} from "@tripapp/domain";
import { getProjectUseCase } from "./get-project.ts";
export async function getProjectBalancesUseCase(
  deps: { projects: ProjectRepository; expenses: ExpenseRepository },
  actor: User,
  projectId: string,
) {
  const project = await getProjectUseCase(deps, actor, projectId);
  const expenses = await deps.expenses.listByProject(projectId);
  const currencies = [
    ...new Set([
      project.settlementCurrency,
      ...expenses.map((expense) => expense.settlementCurrency),
    ]),
  ];
  return currencies.map((currency) =>
    toBurdenStatus(
      expenses,
      project.members.map((m) => m.userId),
      currency,
    ),
  );
}
