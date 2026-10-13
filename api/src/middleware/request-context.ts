import type { FastifyInstance } from "fastify";
export function requestContext(app: FastifyInstance) {
  app.addHook("onSend", async (_req, reply, payload) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    return payload;
  });
}
