import {
  normalizeEmail,
  type User,
  type UnitOfWork,
  type UserRepository,
} from "@tripapp/domain";
import type {
  Clock,
  IdGenerator,
  LoginTokenRepository,
  Session,
  SessionRepository,
  TokenHasher,
} from "../ports.ts";

export type VerifyLoginLinkDeps = {
  uow: UnitOfWork;
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
  return deps.uow.run(async () => {
    const now = deps.clock.now();
    const token = await deps.tokens.consume(deps.hasher.hash(input.token), now);
    if (!token) {
      throw new Error("INVALID_LOGIN_TOKEN");
    }

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
  });
}
