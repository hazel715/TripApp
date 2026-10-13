import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import EmbeddedPostgres from "embedded-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { fileURLToPath } from "node:url";
import { createPostgres } from "./repositories.ts";
import { createMemory } from "../testing/memory.ts";
import {
  createProjectUseCase,
  createExpenseUseCase,
  updateExpenseUseCase,
  deleteExpenseUseCase,
  sendLoginLink,
  verifyLoginLink,
} from "@tripapp/application";
const enabled = process.env.RUN_POSTGRES_TESTS === "1";
describe.skipIf(!enabled)("real PostgreSQL integration", () => {
  let embedded: EmbeddedPostgres | undefined;
  let store: ReturnType<typeof createPostgres>;
  beforeAll(async () => {
    let url = process.env.TEST_DATABASE_URL;
    if (!url) {
      await mkdir(".test-data", { recursive: true });
      embedded = new EmbeddedPostgres({
        databaseDir: `.test-data/pg-${randomUUID()}`,
        user: "tripapp_test",
        password: "local_test_password",
        port: 15439,
        persistent: true,
        onLog: () => {},
        onError: () => {},
      });
      await embedded.initialise();
      await embedded.start();
      await embedded.createDatabase("tripapp_test");
      url =
        "postgres://tripapp_test:local_test_password@localhost:15439/tripapp_test";
    }
    store = createPostgres(url);
    await migrate(drizzle(store.pool), {
      migrationsFolder: fileURLToPath(
        new URL("./migrations/", import.meta.url),
      ),
    });
  }, 60000);
  afterAll(async () => {
    if (store) await store.close();
    if (embedded) await embedded.stop();
  }, 30000);
  it("applies migration twice, persists exact NUMERIC values and rolls back Expense/Share/reopen", async () => {
    await migrate(drizzle(store.pool), {
      migrationsFolder: fileURLToPath(
        new URL("./migrations/", import.meta.url),
      ),
    });
    const deps = { ...createMemory(), ...store };
    const now = new Date();
    const user = {
      id: randomUUID(),
      email: `${randomUUID()}@example.com`,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    };
    await store.users.save(user);
    const project = await createProjectUseCase(deps, user, {
      name: "db",
      defaultExpenseCurrency: "KRW",
      settlementCurrency: "KRW",
    });
    await store.projects.save({ ...project, status: "closed" });
    const input = {
      projectId: project.id,
      payerUserId: user.id,
      description: "exact",
      amount: "100.0001",
      currency: "KRW",
      settlementAmount: "100.0001",
      settlementCurrency: "KRW",
      participantUserIds: [user.id],
    };
    await expect(
      createExpenseUseCase(deps, user, {
        ...input,
        shares: [{ userId: user.id, shareAmount: "100" }],
      }),
    ).rejects.toThrow();
    expect((await store.projects.findById(project.id))?.status).toBe("closed");
    expect(await store.expenses.listByProject(project.id)).toEqual([]);
    const originalSave = deps.projects.save;
    deps.projects.save = async () => {
      throw new Error("failure after expense write");
    };
    try {
      await expect(createExpenseUseCase(deps, user, input)).rejects.toThrow(
        "failure after expense write",
      );
    } finally {
      deps.projects.save = originalSave;
    }
    expect(await store.expenses.listByProject(project.id)).toEqual([]);
    expect((await store.projects.findById(project.id))?.status).toBe("closed");
    const expense = await createExpenseUseCase(deps, user, input);
    expect((await store.projects.findById(project.id))?.status).toBe("active");
    expect((await store.expenses.findById(expense.id))?.amount.toFixed()).toBe(
      "100.0001",
    );
    await expect(
      updateExpenseUseCase(deps, user, expense.id, {
        projectId: project.id,
        settlementAmount: "2",
      }),
    ).rejects.toThrow();
    expect(
      (await store.expenses.findById(expense.id))?.settlementAmount.toFixed(),
    ).toBe("100.0001");
    await store.users.save({ ...user, status: "deactivated" });
    expect((await store.expenses.findById(expense.id))?.shares).toHaveLength(1);
    await expect(
      store.pool.query("DELETE FROM users WHERE id=$1", [user.id]),
    ).rejects.toThrow();
    await deleteExpenseUseCase(deps, user, {
      projectId: project.id,
      expenseId: expense.id,
    });
    expect(await store.expenses.findById(expense.id)).toBeNull();
  });
  it("consumes a hashed login token atomically under concurrent PostgreSQL requests", async () => {
    const deps = { ...createMemory(), ...store };
    await sendLoginLink(deps, { email: `${randomUUID()}@example.com` });
    const token = new URL(deps.messages[0].loginUrl).searchParams.get("token")!;
    const result = await Promise.allSettled([
      verifyLoginLink(deps, { token }),
      verifyLoginLink(deps, { token }),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(verifyLoginLink(deps, { token })).rejects.toThrow();
  });
  it("runs the HTTP Expense flow against PostgreSQL", async () => {
    const { createApp } = await import("../../../api/src/app.ts");
    const deps = { ...createMemory(), ...store };
    const app = await createApp(deps);
    try {
      await app.inject({
        method: "POST",
        url: "/api/auth/login-link",
        payload: { email: `${randomUUID()}@example.com` },
      });
      const token = new URL(deps.messages[0].loginUrl).searchParams.get(
        "token",
      )!;
      const login = await app.inject({
        method: "POST",
        url: "/api/auth/verify",
        payload: { token },
      });
      expect(login.statusCode).toBe(200);
      const cookie = String(login.headers["set-cookie"]).split(";")[0];
      const headers = { cookie };
      const user = login.json().user;
      const project = await app.inject({
        method: "POST",
        url: "/api/projects",
        headers,
        payload: {
          name: "HTTP db",
          defaultExpenseCurrency: "USD",
          settlementCurrency: "KRW",
        },
      });
      expect(project.statusCode).toBe(201);
      const root = `/api/projects/${project.json().id}`;
      const expense = await app.inject({
        method: "POST",
        url: root + "/expenses",
        headers,
        payload: {
          payerUserId: user.id,
          description: "FX override",
          amount: "1.0001",
          currency: "USD",
          fxRate: "1350",
          settlementAmount: "1351.2345",
          settlementCurrency: "KRW",
          participantUserIds: [user.id],
        },
      });
      expect(expense.statusCode).toBe(201);
      expect(
        (
          await store.expenses.findById(expense.json().id)
        )?.settlementAmount.toFixed(),
      ).toBe("1351.2345");
      expect(
        (await app.inject({ url: root + "/balances", headers })).json()[0],
      ).not.toHaveProperty("transfers");
      expect(
        (await app.inject({ url: root + "/settlement", headers })).json()[0]
          .transfers,
      ).toEqual([]);
    } finally {
      await app.close();
    }
  });
});
