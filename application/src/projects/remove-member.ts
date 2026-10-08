import { removeMemberFromProject, requireOwner, type ProjectRepository, type User } from "@tripapp/domain";
import type { Clock } from "../ports.ts";

export async function removeMemberUseCase(
  deps: { projects: ProjectRepository; clock: Clock },
  actor: User,
  input: { projectId: string; userId: string },
) {
  const project = await deps.projects.findById(input.projectId);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  requireOwner(project, actor.id);
  const updated = removeMemberFromProject(project, input.userId, deps.clock.now());
  await deps.projects.save(updated);
  return updated;
}
