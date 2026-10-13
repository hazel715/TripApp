import type { FastifyInstance } from "fastify";
import { DomainError } from "@tripapp/domain";
import { ZodError } from "zod";
export function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    const e = error as Error & { code?: string; statusCode?: number };
    const message = e.message;
    const code = (error as { code?: string }).code;
    const statusCode = (error as { statusCode?: number }).statusCode;
    let status = 500;
    if (e instanceof ZodError || e instanceof DomainError) status = 400;
    if (["NOT_PROJECT_MEMBER", "FORBIDDEN"].includes(code ?? "")) status = 403;
    if (message.endsWith("_NOT_FOUND")) status = 404;
    if (
      ["UNAUTHORIZED", "INVALID_LOGIN_TOKEN", "USER_DEACTIVATED"].includes(
        message,
      )
    )
      status = 401;
    if (message === "INVALID_EMAIL") status = 400;
    if (message === "CATEGORY_EXISTS") status = 409;
    if (["23505", "40001", "40P01"].includes(code ?? "")) status = 409;
    if (statusCode && statusCode >= 400 && statusCode < 500)
      status = statusCode;
    if (status === 500) request.log.error(error);
    return reply
      .code(status)
      .send({ error: status === 500 ? "Internal server error" : message });
  });
}
