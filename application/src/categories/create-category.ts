import { createCategory, type CategoryRepository } from "@tripapp/domain";
import type { IdGenerator } from "../ports.ts";

export async function createCategoryUseCase(
  deps: { categories: CategoryRepository; ids: IdGenerator },
  input: { name: string },
) {
  const existing = await deps.categories.findByName(input.name.trim());
  if (existing) throw new Error("CATEGORY_EXISTS");
  const category = createCategory(deps.ids.next(), input.name);
  await deps.categories.save(category);
  return category;
}
