import { z } from "zod";
import type { FastifyInstance } from "fastify";
import {
  createCategoryUseCase,
  listCategoriesUseCase,
} from "@tripapp/application";
import { actor } from "../plugins/auth.ts";
import type { Dependencies } from "../dependencies.ts";
export function categoriesController(app: FastifyInstance, deps: Dependencies) {
  app.get("/api/categories", async (request) => {
    actor(request);
    return listCategoriesUseCase(deps);
  });
  app.post("/api/categories", async (request, reply) => {
    actor(request);
    return reply
      .code(201)
      .send(
        await createCategoryUseCase(
          deps,
          z
            .object({ name: z.string().trim().min(1).max(100) })
            .parse(request.body),
        ),
      );
  });
}
