import {
  removeMemberFromProject,
  requireOwner,
  type ProjectRepository,
  type User,
  type UnitOfWork,
} from "@tripapp/domain";
import type { Clock, ChangeNotifier } from "../ports.ts";
export async function removeMemberUseCase(
  deps: {
    projects: ProjectRepository;
    clock: Clock;
    uow: UnitOfWork;
    notifier: ChangeNotifier;
  },
  actor: User,
  input: { projectId: string; userId: string },
) {
  const updated = await deps.uow.run(async () => {
    const project = await deps.projects.findById(input.projectId);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    requireOwner(project, actor.id);
    const result = removeMemberFromProject(
      project,
      input.userId,
      deps.clock.now(),
    );
    await deps.projects.save(result);
    return result;
  });
  await deps.notifier.notify({
    projectId: input.projectId,
    resource: "member",
    action: "removed",
  });
  return updated;
}
