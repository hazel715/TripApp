import { AsyncLocalStorage } from "node:async_hooks";
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import {
  Money,
  parseFxRate,
  assertSharesMatchSettlement,
  type UserRepository,
  type ProjectRepository,
  type ExpenseRepository,
  type CategoryRepository,
  type UnitOfWork,
  type Expense,
} from "@tripapp/domain";
import type {
  LoginTokenRepository,
  SessionRepository,
} from "@tripapp/application";
import * as s from "./schema.ts";

export function createPostgres(url: string) {
  const pool = new Pool({ connectionString: url });
  const base = drizzle(pool);
  const scope = new AsyncLocalStorage<NodePgDatabase>();
  const db = () => scope.getStore() ?? base;
  const uow: UnitOfWork = {
    async run(fn) {
      if (scope.getStore()) return fn();
      const client = await pool.connect();
      try {
        await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
        const result = await scope.run(drizzle(client), fn);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
  const users: UserRepository = {
    async findById(id) {
      return (
        (await db().select().from(s.users).where(eq(s.users.id, id)))[0] ?? null
      );
    },
    async findByEmail(email) {
      if (scope.getStore())
        await db().execute(
          sql`select pg_advisory_xact_lock(hashtext(${email}))`,
        );
      return (
        (
          await db().select().from(s.users).where(eq(s.users.email, email))
        )[0] ?? null
      );
    },
    async save(user) {
      await db()
        .insert(s.users)
        .values(user)
        .onConflictDoUpdate({ target: s.users.id, set: user });
    },
  };
  const projects: ProjectRepository = {
    async findById(id) {
      const query = db().select().from(s.projects).where(eq(s.projects.id, id));
      const row = (await (scope.getStore() ? query.for("update") : query))[0];
      if (!row) return null;
      return {
        ...row,
        members: await db()
          .select()
          .from(s.projectMembers)
          .where(eq(s.projectMembers.projectId, id)),
      };
    },
    async listByUserId(userId) {
      const memberships = await db()
        .select()
        .from(s.projectMembers)
        .where(eq(s.projectMembers.userId, userId));
      const result = await Promise.all(
        memberships.map((m) => projects.findById(m.projectId)),
      );
      return result.filter((p) => p !== null);
    },
    async save(project) {
      await uow.run(async () => {
        const { members, ...row } = project;
        await db()
          .insert(s.projects)
          .values(row)
          .onConflictDoUpdate({ target: s.projects.id, set: row });
        await db()
          .delete(s.projectMembers)
          .where(eq(s.projectMembers.projectId, project.id));
        if (members.length) await db().insert(s.projectMembers).values(members);
      });
    },
  };
  async function hydrate(
    row: typeof s.expenses.$inferSelect,
  ): Promise<Expense> {
    const shares = await db()
      .select()
      .from(s.expenseShares)
      .where(eq(s.expenseShares.expenseId, row.id));
    return {
      ...row,
      amount: Money.of(row.amount),
      settlementAmount: Money.of(row.settlementAmount),
      fxRate: parseFxRate(row.fxRate),
      shares: shares.map((share) => ({
        userId: share.userId,
        shareAmount: Money.of(share.shareAmount),
      })),
    };
  }
  const expenses: ExpenseRepository = {
    async findById(id) {
      const row = (
        await db().select().from(s.expenses).where(eq(s.expenses.id, id))
      )[0];
      return row ? hydrate(row) : null;
    },
    async listByProject(projectId) {
      const rows = await db()
        .select()
        .from(s.expenses)
        .where(eq(s.expenses.projectId, projectId))
        .orderBy(s.expenses.expenseDate, s.expenses.createdAt);
      return Promise.all(rows.map(hydrate));
    },
    async save(expense) {
      await uow.run(async () => {
        assertSharesMatchSettlement(expense);
        const { shares, ...rest } = expense;
        const row = {
          ...rest,
          amount: expense.amount.toFixed(),
          settlementAmount: expense.settlementAmount.toFixed(),
          fxRate: expense.fxRate?.toFixed(8) ?? null,
        };
        await db()
          .insert(s.expenses)
          .values(row)
          .onConflictDoUpdate({ target: s.expenses.id, set: row });
        await db()
          .delete(s.expenseShares)
          .where(eq(s.expenseShares.expenseId, expense.id));
        await db()
          .insert(s.expenseShares)
          .values(
            shares.map((share) => ({
              expenseId: expense.id,
              userId: share.userId,
              shareAmount: share.shareAmount.toFixed(),
            })),
          );
      });
    },
    async delete(id) {
      await db().delete(s.expenses).where(eq(s.expenses.id, id));
    },
  };
  const categories: CategoryRepository = {
    async findById(id) {
      return (
        (
          await db().select().from(s.categories).where(eq(s.categories.id, id))
        )[0] ?? null
      );
    },
    async findByName(name) {
      return (
        (
          await db()
            .select()
            .from(s.categories)
            .where(eq(s.categories.name, name))
        )[0] ?? null
      );
    },
    async list() {
      return db().select().from(s.categories).orderBy(s.categories.name);
    },
    async save(category) {
      await db().insert(s.categories).values(category);
    },
  };
  const tokens: LoginTokenRepository = {
    async save(token) {
      await db()
        .insert(s.loginTokens)
        .values(token)
        .onConflictDoUpdate({ target: s.loginTokens.id, set: token });
    },
    async findByTokenHash(hash) {
      return (
        (
          await db()
            .select()
            .from(s.loginTokens)
            .where(eq(s.loginTokens.tokenHash, hash))
        )[0] ?? null
      );
    },
    async consume(hash, now) {
      return (
        (
          await db()
            .update(s.loginTokens)
            .set({ consumedAt: now })
            .where(
              and(
                eq(s.loginTokens.tokenHash, hash),
                isNull(s.loginTokens.consumedAt),
                gt(s.loginTokens.expiresAt, now),
              ),
            )
            .returning()
        )[0] ?? null
      );
    },
  };
  const sessions: SessionRepository = {
    async save(session) {
      await db().insert(s.sessions).values(session);
    },
    async findByTokenHash(hash) {
      return (
        (
          await db()
            .select()
            .from(s.sessions)
            .where(eq(s.sessions.tokenHash, hash))
        )[0] ?? null
      );
    },
    async deleteByTokenHash(hash) {
      await db().delete(s.sessions).where(eq(s.sessions.tokenHash, hash));
    },
  };
  return {
    users,
    projects,
    expenses,
    categories,
    tokens,
    sessions,
    uow,
    pool,
    close: () => pool.end(),
  };
}
export type Persistence = ReturnType<typeof createPostgres>;
