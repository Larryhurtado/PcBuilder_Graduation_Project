import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Sin DATABASE_URL la API arranca, pero /ready responde 503.
  DATABASE_URL: z.string().min(1).optional(),
  // Lista de orígenes permitidos separados por coma.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Secreto para anonimizar la sesión de las métricas. Sin él se genera uno al arrancar.
  ANALYTICS_SECRET: z.string().min(16).optional(),
});

/**
 * Lee y valida las variables de entorno. Lanza un ZodError si alguna es inválida.
 * @param {Record<string, string | undefined>} [env]
 */
export function loadConfig(env = process.env) {
  return schema.parse(env);
}
