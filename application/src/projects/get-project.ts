import {
  requireMember,
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
