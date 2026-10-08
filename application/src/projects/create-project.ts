import { createProject, type Project, type ProjectRepository, type User } from "@tripapp/domain";
import type { Clock, IdGenerator } from "../ports.ts";

export async function createProjectUseCase(
  deps: { projects: ProjectRepository; clock: Clock; ids: IdGenerator },
  actor: User,
  input: { name: string; defaultExpenseCurrency: string; settlementCurrency: string },
): Promise<Project> {
  const displayName = actor.email.split("@")[0] ?? actor.email;
  const project = createProject({
    id: deps.ids.next(),
    name: input.name,
    defaultExpenseCurrency: input.defaultExpenseCurrency,
    settlementCurrency: input.settlementCurrency,
    ownerUserId: actor.id,
    ownerDisplayName: displayName,
    now: deps.clock.now(),
  });
  await deps.projects.save(project);
  return project;
}
