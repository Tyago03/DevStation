import type { RunRecipe } from '../../shared/contracts';

export function recipeArguments(recipe: RunRecipe, extras: string[] = []): string[] {
  if (recipe.kind === 'python-module') return ['-I', '-u', '-m', 'http.server', String(recipe.port), '--bind', '127.0.0.1'];
  return recipe.kind === 'python-script' ? ['-u', recipe.script.path, ...extras] : [recipe.script.path, ...extras];
}
export function validPort(value: string) { return /^\d+$/u.test(value) && Number(value) >= 1024 && Number(value) <= 65535; }
