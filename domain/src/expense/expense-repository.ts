import type { Expense } from "./expense.ts";

export interface ExpenseRepository {
  findById(id: string): Promise<Expense | null>;
  listByProject(projectId: string): Promise<Expense[]>;
  save(expense: Expense): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface UnitOfWork {
  run<T>(fn: () => Promise<T>): Promise<T>;
}
