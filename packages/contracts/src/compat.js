import { z } from 'zod';
import { componentCategorySchema } from './catalog.js';

/** Una pieza del armado: la categoría y el componente del catálogo. Las especificaciones las pone el servidor. */
export const buildItemSchema = z.strictObject({
  category: componentCategorySchema,
  componentId: z.guid(),
});

/** Máximo una pieza por categoría (8 ranuras). */
export const buildItemsSchema = z
  .array(buildItemSchema)
  .max(8, 'Un armado tiene como máximo 8 piezas')
  .refine((items) => new Set(items.map((i) => i.category)).size === items.length, {
    message: 'Solo puede haber una pieza por categoría',
  });

/** POST /compat/validate */
export const validateBodySchema = z.strictObject({ items: buildItemsSchema });

/** POST /compat/constraints: restricciones para elegir la siguiente pieza de `category`. */
export const constraintsBodySchema = z.strictObject({
  category: componentCategorySchema,
  items: buildItemsSchema,
});

export const ruleResultSchema = z.object({
  code: z.string(),
  status: z.enum(['ok', 'fail', 'unknown', 'not_applicable']),
  /** El motor devuelve `null` en las reglas que cumplen o no aplican; también se acepta omitido. */
  message: z.string().nullish(),
  /** Categorías de las piezas que intervienen en la regla. */
  parts: z.array(z.string()).optional(),
  severity: z.string().optional(),
});

export const evaluationSchema = z.object({
  results: z.array(ruleResultSchema),
  summary: z.object({ incompatible: z.number(), unknown: z.number(), ok: z.number() }),
  estimatedWatts: z.number(),
  recommendedPsuW: z.number(),
});

export const buildComponentSchema = z.object({
  category: componentCategorySchema,
  componentId: z.guid(),
  brand: z.string(),
  model: z.string(),
  displayName: z.string(),
});

export const validateResponseSchema = evaluationSchema.extend({
  items: z.array(buildComponentSchema),
});

export const constraintsResponseSchema = z.object({
  category: componentCategorySchema,
  constraints: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])),
});
