import { z } from 'zod';
export const noInput = z.undefined();
export const idSchema = z.string().uuid();
const cleanText = z.string().min(1).max(32767).refine(value => !/[\u0000-\u001f]/u.test(value), 'Control characters are not allowed.');
export const configSchema = z.object({
  id: idSchema.optional(), projectId: idSchema,
  label: cleanText.max(60), executablePath: cleanText, workingDir: cleanText,
  args: z.array(z.string().max(8192).refine(value => !value.includes('\0'))).max(100),
}).strict();
export const settingsSchema = z.object({ theme: z.enum(['dark', 'light', 'system']) }).strict();
export const helpSchema = z.enum(['git', 'node', 'python', 'readme']);
