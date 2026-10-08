import type { ProjectRepository, User } from "@tripapp/domain";

export async function listProjectsUseCase(
  deps: { projects: ProjectRepository },
  actor: User,
) {
  return deps.projects.listByUserId(actor.id);
}
