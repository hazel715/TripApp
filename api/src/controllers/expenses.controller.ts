import { z } from "zod";
import type { FastifyInstance } from "fastify";
import {
  createExpenseUseCase,
  updateExpenseUseCase,
  deleteExpenseUseCase,
  listExpensesUseCase,
  getProjectUseCase,
  parseQuickMemo,
} from "@tripapp/application";
import { actor } from "../plugins/auth.ts";
import { params, expenseBody } from "../validation.ts";
import type { Dependencies } from "../dependencies.ts";
export function expensesController(app: FastifyInstance, deps: Dependencies) {
  app.get("/api/projects/:id/expenses", async (request) =>
    deps.uow.run(() =>
      listExpensesUseCase(
        deps,
        actor(request),
        params.parse(request.params).id,
      ),
    ),
  );
  app.post("/api/projects/:id/expenses", async (request, reply) => {
    const { id } = params.parse(request.params);
    return reply
      .code(201)
      .send(
        await createExpenseUseCase(deps, actor(request), {
          ...expenseBody.parse(request.body),
          projectId: id,
        }),
      );
  });
  app.patch("/api/projects/:id/expenses/:expenseId", async (request) => {
    const { id, expenseId } = params.parse(request.params);
    return updateExpenseUseCase(deps, actor(request), expenseId!, {
      ...expenseBody.partial().parse(request.body),
      projectId: id,
    });
  });
  app.delete(
    "/api/projects/:id/expenses/:expenseId",
    async (request, reply) => {
      const { id, expenseId } = params.parse(request.params);
      await deleteExpenseUseCase(deps, actor(request), {
        projectId: id,
        expenseId: expenseId!,
      });
      return reply.code(204).send();
    },
  );
  app.post("/api/projects/:id/expenses/quick-memo", async (request) => {
    const { id } = params.parse(request.params);
    const project = await getProjectUseCase(deps, actor(request), id);
    return parseQuickMemo(
      z.object({ text: z.string().min(1).max(1000) }).parse(request.body).text,
      project,
    );
  });
}
