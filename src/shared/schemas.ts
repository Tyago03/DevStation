import { z } from 'zod';
export const noInput = z.undefined();
export const idSchema = z.string().uuid();
const cleanText = z.string().min(1).max(32767).refine(value => !/[\u0000-\u001f]/u.test(value), 'Control characters are not allowed.');
export const scriptSelectionSchema = z.object({ path: cleanText, fingerprint: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const recipeSchema = z.union([
  z.object({ kind: z.enum(['python-script', 'node-script']), script: scriptSelectionSchema }).strict(),
  z.object({ kind: z.literal('python-module'), module: z.literal('http.server'), port: z.number().int().min(1024).max(65535) }).strict(),
]);
export const configSchema = z.object({
  id: idSchema.optional(), projectId: idSchema,
  label: cleanText.max(60), executablePath: cleanText, workingDir: cleanText,
  args: z.array(z.string().max(8192).refine(value => !value.includes('\0'))).max(100),
  recipe: recipeSchema.optional(),
}).strict();
export const tourSchema = z.object({ status: z.enum(['not-started', 'in-progress', 'completed', 'skipped']), step: z.number().int().min(0).max(4) }).strict();
export const settingsSchema = z.object({ theme: z.enum(['dark', 'light', 'system']), tour: tourSchema.optional() }).strict();
export const helpSchema = z.enum(['git', 'node', 'python']);
export const chooseScriptSchema = z.object({ projectId: idSchema, kind: z.enum(['python', 'node']) }).strict();
export const authorizeScriptSchema = z.object({ configId: idSchema, token: idSchema }).strict();
export const shutdownActionSchema = z.enum(['retry', 'keep-open', 'quit-anyway']);
