import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { createMemory } from "../../infrastructure/src/testing/memory.ts";
import {
  createExpenseUseCase,
  updateExpenseUseCase,
  deleteExpenseUseCase,
  verifyLoginLink,
} from "@tripapp/application";
const apps: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
async function setup() {
  const deps = createMemory();
  const app = await createApp(deps);
  apps.push(app);
  await app.inject({
    method: "POST",
    url: "/api/auth/login-link",
    payload: { email: "owner@example.com" },
  });
  const token = new URL(deps.messages[0].loginUrl).searchParams.get("token")!;
  const login = await app.inject({
    method: "POST",
    url: "/api/auth/verify",
    payload: { token },
  });
  const cookie = String(login.headers["set-cookie"]).split(";")[0];
  const user = login.json().user;
  const created = await app.inject({
    method: "POST",
    url: "/api/projects",
    headers: { cookie },
    payload: {
      name: "Trip",
      defaultExpenseCurrency: "KRW",
      settlementCurrency: "KRW",
    },
  });
  return { app, deps, cookie, user, project: created.json(), token };
}
describe("HTTP MVP", () => {
  it("authenticates once, creates projects, rejects anonymous and invalid input", async () => {
    const { app, cookie, token } = await setup();
    expect((await app.inject({ url: "/api/projects" })).statusCode).toBe(401);
    expect(
      (await app.inject({ url: "/api/projects", headers: { cookie } })).json(),
    ).toHaveLength(1);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/verify",
          payload: { token },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/projects",
          headers: { cookie },
          payload: { name: "" },
        })
      ).statusCode,
    ).toBe(400);
  });
  it("handles global categories, members, memo, Expense CRUD and both settlement views", async () => {
    const { app, cookie, user, project } = await setup();
    const headers = { cookie };
    const root = `/api/projects/${project.id}`;
    const added = await app.inject({
      method: "POST",
      url: root + "/members",
      headers,
      payload: { email: "member@example.com", displayName: "철수" },
    });
    expect(added.statusCode).toBe(200);
    const member = added.json().members[1];
    const category = await app.inject({
      method: "POST",
      url: "/api/categories",
      headers,
      payload: { name: "식사" },
    });
    expect(category.statusCode).toBe(201);
    expect(
      (await app.inject({ url: "/api/categories", headers })).json(),
    ).toHaveLength(1);
    const memo = await app.inject({
      method: "POST",
      url: root + "/expenses/quick-memo",
      headers,
      payload: { text: "점심 12000 철수" },
    });
    expect(memo.json().participantUserIds).toEqual([member.userId]);
    const body = {
      payerUserId: user.id,
      description: "점심",
      amount: "100",
      currency: "USD",
      fxRate: "1350",
      settlementAmount: "135001",
      settlementCurrency: "KRW",
      categoryId: category.json().id,
      participantUserIds: [member.userId],
    };
    const created = await app.inject({
      method: "POST",
      url: root + "/expenses",
      headers,
      payload: body,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().settlementAmount).toBe("135001.0000");
    const id = created.json().id;
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: root + "/expenses/" + id,
          headers,
          payload: { settlementAmount: "1" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: root + "/expenses/" + id,
          headers,
          payload: {
            settlementAmount: "-30",
            shares: [{ userId: member.userId, shareAmount: "-30" }],
          },
        })
      ).statusCode,
    ).toBe(200);
    const burden = (
      await app.inject({ url: root + "/balances", headers })
    ).json();
    expect(burden[0]).not.toHaveProperty("transfers");
    expect(
      burden[0].rows.find((r: { userId: string }) => r.userId === user.id)
        .difference,
    ).toBe("-30.0000");
    const final = (
      await app.inject({ url: root + "/settlement", headers })
    ).json();
    expect(final[0].transfers).toHaveLength(1);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: root + "/expenses/" + id,
          headers,
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ url: root + "/expenses", headers })).json(),
    ).toEqual([]);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: root + "/members/" + member.userId,
          headers,
        })
      ).statusCode,
    ).toBe(200);
  });
  it("rolls back Expense/Share/reopen together and only publishes after commit", async () => {
    const { deps, user, project } = await setup();
    let notifications = 0;
    deps.notifier.subscribe(project.id, () => {
      notifications++;
    });
    await deps.projects.save({
      ...project,
      status: "closed",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const input = {
      projectId: project.id,
      payerUserId: user.id,
      description: "refund",
      amount: "-10",
      currency: "KRW",
      settlementAmount: "-10",
      settlementCurrency: "KRW",
      participantUserIds: [user.id],
    };
    const original = deps.projects.save;
    deps.projects.save = async () => {
      throw new Error("simulated write failure");
    };
    await expect(createExpenseUseCase(deps, user, input)).rejects.toThrow(
      /simulated/,
    );
    deps.projects.save = original;
    expect(await deps.expenses.listByProject(project.id)).toEqual([]);
    expect((await deps.projects.findById(project.id))?.status).toBe("closed");
    expect(notifications).toBe(0);
    const expense = await createExpenseUseCase(deps, user, input);
    expect((await deps.projects.findById(project.id))?.status).toBe("active");
    expect(notifications).toBe(1);
    await expect(
      updateExpenseUseCase(deps, user, expense.id, {
        projectId: project.id,
        settlementAmount: "-11",
      }),
    ).rejects.toThrow();
    expect(
      (await deps.expenses.findById(expense.id))?.settlementAmount.toString(),
    ).toBe("-10");
    expect(notifications).toBe(1);
    await deleteExpenseUseCase(deps, user, {
      projectId: project.id,
      expenseId: expense.id,
    });
    expect(notifications).toBe(2);
  });
  it("permits one concurrent verification and blocks expired/deactivated sessions", async () => {
    const { app, deps, user, cookie } = await setup();
    await app.inject({
      method: "POST",
      url: "/api/auth/login-link",
      payload: { email: user.email },
    });
    const token = new URL(deps.messages.at(-1)!.loginUrl).searchParams.get(
      "token",
    )!;
    const results = await Promise.allSettled([
      verifyLoginLink(deps, { token }),
      verifyLoginLink(deps, { token }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await deps.users.save({
      ...user,
      status: "deactivated",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(
      (await app.inject({ url: "/api/projects", headers: { cookie } }))
        .statusCode,
    ).toBe(401);
  });
});

describe("authentication and realtime boundaries", () => {
  it("rejects expired login links, sessions, deactivated accounts and foreign origins", async () => {
    const { app, deps, user, cookie } = await setup();
    await app.inject({
      method: "POST",
      url: "/api/auth/login-link",
      payload: { email: user.email },
    });
    const token = new URL(deps.messages.at(-1)!.loginUrl).searchParams.get(
      "token",
    )!;
    const now = deps.clock.now();
    deps.clock.now = () => new Date(now.getTime() + 31 * 86400000);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/verify",
          payload: { token },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (await app.inject({ url: "/api/projects", headers: { cookie } }))
        .statusCode,
    ).toBe(401);
    deps.clock.now = () => now;
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/categories",
          headers: { cookie, origin: "https://foreign.example" },
          payload: { name: "no" },
        })
      ).statusCode,
    ).toBe(403);
    await deps.users.save({
      ...user,
      status: "deactivated",
      createdAt: now,
      updatedAt: now,
    });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/verify",
          payload: { token },
        })
      ).statusCode,
    ).toBe(401);
  });
  it("forbids nonmembers and keeps currency overrides in separate ledgers", async () => {
    const { app, deps, cookie, user, project } = await setup();
    const root = `/api/projects/${project.id}`;
    await app.inject({
      method: "POST",
      url: "/api/auth/login-link",
      payload: { email: "outsider@example.com" },
    });
    const token = new URL(deps.messages.at(-1)!.loginUrl).searchParams.get(
      "token",
    )!;
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/verify",
      payload: { token },
    });
    const outsider = String(login.headers["set-cookie"]).split(";")[0];
    expect(
      (await app.inject({ url: root, headers: { cookie: outsider } }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          url: root + "/events",
          headers: { cookie: outsider },
        })
      ).statusCode,
    ).toBe(403);
    const headers = { cookie };
    expect(
      (
        await app.inject({
          method: "POST",
          url: root + "/members",
          headers,
          payload: { email: "member@example.com", role: "admin" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "POST",
          url: root + "/expenses",
          headers,
          payload: {
            payerUserId: user.id,
            description: "USD override",
            amount: "1.0001",
            currency: "USD",
            settlementAmount: "1.0001",
            settlementCurrency: "USD",
            participantUserIds: [user.id],
          },
        })
      ).statusCode,
    ).toBe(201);
    const groups = (
      await app.inject({ url: root + "/balances", headers })
    ).json();
    expect(groups.map((g: { currency: string }) => g.currency)).toEqual([
      "KRW",
      "USD",
    ]);
    expect(groups[0].rows[0].paid).toBe("0.0000");
    expect(groups[1].rows[0].paid).toBe("1.0001");
  });
  it("streams an authenticated committed change and disconnects removed members", async () => {
    const { app, deps, cookie, user, project } = await setup();
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 5000);
    try {
      const response = await fetch(
        `${address}/api/projects/${project.id}/events`,
        { headers: { cookie }, signal: abort.signal },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "text/event-stream",
      );
      const reader = response.body!.getReader();
      await reader.read();
      await deps.notifier.notify({
        projectId: project.id,
        resource: "expense",
        action: "created",
      });
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        "event: project.changed",
      );
      await deps.projects.save({
        ...project,
        members: project.members.filter(
          (m: { userId: string }) => m.userId !== user.id,
        ),
      });
      await deps.notifier.notify({
        projectId: project.id,
        resource: "member",
        action: "removed",
      });
      expect((await reader.read()).done).toBe(true);
    } finally {
      clearTimeout(timer);
      abort.abort();
    }
  });
});
