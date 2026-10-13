import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { sendLoginLink, verifyLoginLink } from "@tripapp/application";
import { actor, cookieName } from "../plugins/auth.ts";
import type { Dependencies } from "../dependencies.ts";
export function authController(app: FastifyInstance, deps: Dependencies) {
  app.post(
    "/api/auth/login-link",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request) =>
      sendLoginLink(
        deps,
        z.object({ email: z.email().max(254) }).parse(request.body),
      ),
  );
  app.post("/api/auth/verify", async (request, reply) => {
    const result = await verifyLoginLink(
      deps,
      z
        .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
        .parse(request.body),
    );
    reply.setCookie(cookieName, result.sessionToken, {
      httpOnly: true,
      secure: deps.production,
      sameSite: "lax",
      path: "/",
      maxAge: deps.sessionTtlDays * 86400,
    });
    return { user: result.user, isNewUser: result.isNewUser };
  });
  app.get("/api/auth/me", async (request) => actor(request));
  app.post("/api/auth/logout", async (request, reply) => {
    const raw = request.cookies[cookieName];
    if (raw) await deps.sessions.deleteByTokenHash(deps.hasher.hash(raw));
    reply.clearCookie(cookieName, { path: "/" });
    return { ok: true };
  });
}
