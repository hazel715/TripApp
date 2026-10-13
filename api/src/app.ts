import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { Money } from "@tripapp/domain";
import type { Dependencies } from "./dependencies.ts";
import { authPlugin } from "./plugins/auth.ts";
import { ssePlugin } from "./plugins/sse.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { requestContext } from "./middleware/request-context.ts";
import { authRoutes } from "./routes/auth.routes.ts";
import { projectsRoutes } from "./routes/projects.routes.ts";
import { expensesRoutes } from "./routes/expenses.routes.ts";
import { categoriesRoutes } from "./routes/categories.routes.ts";
export async function createApp(deps: Dependencies) {
  const app = Fastify({
    logger: false,
    bodyLimit: 65536,
    forceCloseConnections: true,
  });
  await app.register(cookie);
  await app.register(cors, { origin: deps.webOrigin, credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.setReplySerializer((payload) =>
    JSON.stringify(payload, (_key, value) =>
      value instanceof Money ? value.toFixed() : value,
    ),
  );
  errorHandler(app);
  requestContext(app);
  authPlugin(app, deps);
  authRoutes(app, deps);
  projectsRoutes(app, deps);
  expensesRoutes(app, deps);
  categoriesRoutes(app, deps);
  ssePlugin(app, deps);
  app.get("/health", async () => ({ ok: true }));
  await app.ready();
  return app;
}
