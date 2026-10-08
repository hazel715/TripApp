import type { CategoryRepository } from "@tripapp/domain";

export async function listCategoriesUseCase(deps: { categories: CategoryRepository }) {
  return deps.categories.list();
}
