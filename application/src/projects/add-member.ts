import {
  addMemberToProject,
  normalizeEmail,
  requireOwner,
  type MemberRole,
  type ProjectRepository,
  type User,
  type UserRepository,
  type UnitOfWork,
} from "@tripapp/domain";
import type { Clock, IdGenerator, ChangeNotifier } from "../ports.ts";
export async function addMemberUseCase(
  deps: {
    projects: ProjectRepository;
    users: UserRepository;
    clock: Clock;
    ids: IdGenerator;
    uow: UnitOfWork;
    notifier: ChangeNotifier;
  },
  actor: User,
  input: {
    projectId: string;
    email: string;
    role?: MemberRole;
    displayName?: string;
  },
) {
  const updated = await deps.uow.run(async () => {
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
    const result = addMemberToProject(project, {
      userId: user.id,
      role: input.role ?? "member",
      displayName: (input.displayName ?? email.split("@")[0] ?? email).trim(),
      now,
    });
    await deps.projects.save(result);
    return result;
  });
  await deps.notifier.notify({
    projectId: input.projectId,
    resource: "member",
    action: "added",
  });
  return updated;
}
