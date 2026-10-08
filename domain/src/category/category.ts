import { DomainError } from "../shared/errors.ts";

export type Category = {
  id: string;
  name: string;
};

export function createCategory(id: string, name: string): Category {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new DomainError("INVALID_CATEGORY", "Category name is required");
  }
  return { id, name: trimmed };
}

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  list(): Promise<Category[]>;
  save(category: Category): Promise<void>;
}
