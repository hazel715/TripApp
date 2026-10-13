import type { User } from "@tripapp/domain";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Dependencies } from "../dependencies.ts";
declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
  }
}
export function actor(request: FastifyRequest): User {
  if (!request.user) throw new Error("UNAUTHORIZED");
  return request.user;
}
export const cookieName = "tripapp_session";
export function authPlugin(app: FastifyInstance, deps: Dependencies) {
  app.decorateRequest("user", null);
  app.addHook("preHandler", async (request, reply) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      request.headers.origin &&
      request.headers.origin !== deps.webOrigin
    ) {
      return reply.code(403).send({ error: "Origin forbidden" });
    }
    const raw = request.cookies[cookieName];
    if (raw) {
      const session = await deps.sessions.findByTokenHash(
        deps.hasher.hash(raw),
      );
      if (session && session.expiresAt > deps.clock.now()) {
        const user = await deps.users.findById(session.userId);
        if (user?.status === "active") request.user = user;
      }
    }
  });
}
