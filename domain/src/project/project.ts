import { DomainError } from "../shared/errors.ts";
import { assertCurrencyCode, type CurrencyCode } from "../shared/currency.ts";
import type { MemberRole, ProjectMember } from "./project-member.ts";

export type ProjectStatus = "active" | "closed";

export type Project = {
  id: string;
  name: string;
  defaultExpenseCurrency: CurrencyCode;
  settlementCurrency: CurrencyCode;
  status: ProjectStatus;
  members: ProjectMember[];
  createdAt: Date;
  updatedAt: Date;
};

export function createProject(input: {
  id: string;
  name: string;
  defaultExpenseCurrency: string;
  settlementCurrency: string;
  ownerUserId: string;
  ownerDisplayName: string;
  now: Date;
}): Project {
  const name = input.name.trim();
  if (!name) {
    throw new DomainError("INVALID_PROJECT", "Project name is required");
  }
  return {
    id: input.id,
    name,
    defaultExpenseCurrency: assertCurrencyCode(input.defaultExpenseCurrency),
    settlementCurrency: assertCurrencyCode(input.settlementCurrency),
    status: "active",
    members: [
      {
        projectId: input.id,
        userId: input.ownerUserId,
        role: "owner",
        displayName: input.ownerDisplayName,
      },
    ],
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function findMember(project: Project, userId: string): ProjectMember | undefined {
  return project.members.find((m) => m.userId === userId);
}

export function requireMember(project: Project, userId: string): ProjectMember {
  const member = findMember(project, userId);
  if (!member) {
    throw new DomainError("NOT_PROJECT_MEMBER", "User is not a member of this project");
  }
  return member;
}

export function requireOwner(project: Project, userId: string): ProjectMember {
  const member = requireMember(project, userId);
  if (member.role !== "owner") {
    throw new DomainError("FORBIDDEN", "Only an owner can perform this action");
  }
  return member;
}

export function addMemberToProject(
  project: Project,
  input: { userId: string; role: MemberRole; displayName: string; now: Date },
): Project {
  if (findMember(project, input.userId)) {
    throw new DomainError("MEMBER_EXISTS", "User is already a member");
  }
  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new DomainError("INVALID_MEMBER", "Display name is required");
  }
  return {
    ...project,
    members: [
      ...project.members,
      {
        projectId: project.id,
        userId: input.userId,
        role: input.role,
        displayName,
      },
    ],
    updatedAt: input.now,
  };
}

export function removeMemberFromProject(
  project: Project,
  userId: string,
  now: Date,
): Project {
  const target = requireMember(project, userId);
  if (target.role === "owner") {
    const owners = project.members.filter((m) => m.role === "owner");
    if (owners.length <= 1) {
      throw new DomainError("LAST_OWNER", "Cannot remove the last owner");
    }
  }
  return {
    ...project,
    members: project.members.filter((m) => m.userId !== userId),
    updatedAt: now,
  };
}

export function reopenProjectIfClosed(project: Project, now: Date): Project {
  if (project.status !== "closed") {
    return project;
  }
  return { ...project, status: "active", updatedAt: now };
}

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  listByUserId(userId: string): Promise<Project[]>;
  save(project: Project): Promise<void>;
}
