import {
  addMemberToProject,
  normalizeEmail,
  requireOwner,
  type MemberRole,
  type ProjectRepository,
  type User,
  type UserRepository,
} from "@tripapp/domain";
import type { Clock, IdGenerator } from "../ports.ts";

export async function addMemberUseCase(
  deps: {
    projects: ProjectRepository;
    users: UserRepository;
    clock: Clock;
    ids: IdGenerator;
  },
  actor: User,
  input: { projectId: string; email: string; role?: MemberRole; displayName?: string },
) {
  const project = await deps.projects.findById(input.projectId);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  requireOwner(project, actor.id);

  const email = normalizeEmail(input.email);
  let user = await deps.users.findByEmail(email);
  const now = deps.clock.now();
  if (!user) {
    user = {
      id: deps.ids.next(),
      email,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await deps.users.save(user);
  }

  const displayName = (input.displayName ?? email.split("@")[0] ?? email).trim();
  const updated = addMemberToProject(project, {
    userId: user.id,
    role: input.role ?? "member",
    displayName,
    now,
  });
  await deps.projects.save(updated);
  return updated;
}
