import { describe, expect, it } from "vitest";
import { addMemberToProject, createProject, removeMemberFromProject, reopenProjectIfClosed } from "./project.ts";

describe("project members and status", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("creates an owner member", () => {
    const project = createProject({
      id: "p1",
      name: "장보기",
      defaultExpenseCurrency: "KRW",
      settlementCurrency: "KRW",
      ownerUserId: "u1",
      ownerDisplayName: "민수",
      now,
    });
    expect(project.members[0].role).toBe("owner");
    expect(project.status).toBe("active");
  });

  it("adds a member role", () => {
    let project = createProject({
      id: "p1",
      name: "장보기",
      defaultExpenseCurrency: "krw",
      settlementCurrency: "krw",
      ownerUserId: "u1",
      ownerDisplayName: "민수",
      now,
    });
    project = addMemberToProject(project, {
      userId: "u2",
      role: "member",
      displayName: "철수",
      now,
    });
    expect(project.members).toHaveLength(2);
    expect(project.members[1].role).toBe("member");
  });

  it("rejects removing the last owner", () => {
    const project = createProject({
      id: "p1",
      name: "장보기",
      defaultExpenseCurrency: "KRW",
      settlementCurrency: "KRW",
      ownerUserId: "u1",
      ownerDisplayName: "민수",
      now,
    });
    expect(() => removeMemberFromProject(project, "u1", now)).toThrow(/last owner/);
  });

  it("reopens a closed project", () => {
    const project = createProject({
      id: "p1",
      name: "장보기",
      defaultExpenseCurrency: "KRW",
      settlementCurrency: "KRW",
      ownerUserId: "u1",
      ownerDisplayName: "민수",
      now,
    });
    const closed = { ...project, status: "closed" as const };
    const reopened = reopenProjectIfClosed(closed, now);
    expect(reopened.status).toBe("active");
  });
});
