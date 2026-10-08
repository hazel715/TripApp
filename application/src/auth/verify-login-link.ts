import { normalizeEmail, type User, type UserRepository } from "@tripapp/domain";
import type {
  Clock,
  IdGenerator,
  LoginTokenRepository,
  Session,
  SessionRepository,
  TokenHasher,
} from "../ports.ts";

export type VerifyLoginLinkDeps = {
  tokens: LoginTokenRepository;
  sessions: SessionRepository;
  users: UserRepository;
  clock: Clock;
  ids: IdGenerator;
  hasher: TokenHasher;
  sessionTtlDays: number;
};

export async function verifyLoginLink(
  deps: VerifyLoginLinkDeps,
  input: { token: string },
): Promise<{ sessionToken: string; user: User; isNewUser: boolean }> {
  const token = await deps.tokens.findByTokenHash(deps.hasher.hash(input.token));
  const now = deps.clock.now();
  if (!token || token.consumedAt || token.expiresAt <= now) {
    throw new Error("INVALID_LOGIN_TOKEN");
  }
  token.consumedAt = now;
  await deps.tokens.save(token);

  const email = normalizeEmail(token.email);
  let user = await deps.users.findByEmail(email);
  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    user = {
      id: deps.ids.next(),
      email,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await deps.users.save(user);
  }
  if (user.status === "deactivated") {
    throw new Error("USER_DEACTIVATED");
  }

  const sessionToken = deps.hasher.randomToken();
  const session: Session = {
    id: deps.ids.next(),
    userId: user.id,
    tokenHash: deps.hasher.hash(sessionToken),
    expiresAt: new Date(now.getTime() + deps.sessionTtlDays * 86_400_000),
    createdAt: now,
  };
  await deps.sessions.save(session);
  return { sessionToken, user, isNewUser };
}
