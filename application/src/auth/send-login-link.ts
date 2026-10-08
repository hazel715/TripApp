import { normalizeEmail } from "@tripapp/domain";
import type { Clock, EmailSender, IdGenerator, LoginTokenRepository, TokenHasher } from "../ports.ts";

export type SendLoginLinkDeps = {
  tokens: LoginTokenRepository;
  email: EmailSender;
  clock: Clock;
  ids: IdGenerator;
  hasher: TokenHasher;
  webOrigin: string;
  ttlMinutes: number;
};

export async function sendLoginLink(
  deps: SendLoginLinkDeps,
  input: { email: string },
): Promise<{ delivered: true }> {
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) {
    throw new Error("INVALID_EMAIL");
  }
  const raw = deps.hasher.randomToken();
  const now = deps.clock.now();
  const expiresAt = new Date(now.getTime() + deps.ttlMinutes * 60_000);
  await deps.tokens.save({
    id: deps.ids.next(),
    email,
    tokenHash: deps.hasher.hash(raw),
    expiresAt,
    consumedAt: null,
  });
  const loginUrl = `${deps.webOrigin.replace(/\/$/, "")}/login/callback?token=${raw}`;
  await deps.email.sendLoginLink({
    to: email,
    subject: "TripApp login link",
    text: `Sign in: ${loginUrl}\nThis link expires in ${deps.ttlMinutes} minutes and can be used once.`,
    loginUrl,
  });
  return { delivered: true };
}
