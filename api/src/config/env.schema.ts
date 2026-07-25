import { z } from 'zod';

/**
 * Validated once at startup so a missing or malformed environment variable
 * fails immediately with a clear message, instead of surfacing as `undefined`
 * mid-request (or worse, mid-transaction) the first time that code path runs.
 */
export const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  // Comma-separated list of allowed browser origins for CORS, e.g.
  // "http://localhost:5173,https://shopsense.example.com". Defaults to the
  // Vite dev server port so local frontend development works out of the box.
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}
