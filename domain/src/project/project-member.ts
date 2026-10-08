export type MemberRole = "owner" | "member";

export type ProjectMember = {
  projectId: string;
  userId: string;
  role: MemberRole;
  displayName: string;
};

export function isOwner(member: ProjectMember): boolean {
  return member.role === "owner";
}
