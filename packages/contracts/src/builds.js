import { z } from 'zod';
import { componentCategorySchema } from './catalog.js';
import { evaluationSchema } from './compat.js';

export const SHARE_CODE_PATTERN = /^[A-Za-z0-9]{10}$/;

const name = z.string().trim().min(1).max(100);

/** Pieza de un armado guardado: el componente y, si se eligió, la oferta con cuyo precio se arma. */
export const savedItemInputSchema = z.strictObject({
  category: componentCategorySchema,
  componentId: z.guid(),
  offerId: z.guid().nullish(),
});

const items = z
  .array(savedItemInputSchema)
  .min(1, 'Agrega al menos una pieza')
  .max(8, 'Un armado tiene como máximo 8 piezas')
  .refine((list) => new Set(list.map((i) => i.category)).size === list.length, {
    message: 'Solo puede haber una pieza por categoría',
  });

/**
 * Guardar un armado. Si tiene incompatibilidades se rechaza (422 BUILD_INCOMPATIBLE) salvo que
 * se envíe `draft: true`, que lo guarda como borrador con el aviso.
 */
export const saveBuildBodySchema = z.strictObject({
  name: name.default('Mi configuración'),
  items,
  draft: z.boolean().default(false),
});

export const shareCodeParamsSchema = z.object({
  shareCode: z.string().regex(SHARE_CODE_PATTERN, 'Código de 10 letras y números'),
});

export const buildIdParamsSchema = z.object({ id: z.guid() });

export const savedItemSchema = z.object({
  category: componentCategorySchema,
  componentId: z.guid(),
  brand: z.string(),
  model: z.string(),
  displayName: z.string(),
  offerId: z.guid().nullable(),
  /** Precio al momento de armar; null si no se eligió oferta. */
  unitPriceCop: z.number().nullable(),
});

export const savedBuildSchema = z.object({
  id: z.guid(),
  name: z.string(),
  shareCode: z.string(),
  estimatedWatts: z.number().nullable(),
  totalPriceCop: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** true si el dueño es el usuario que consulta. */
  isOwner: z.boolean(),
  items: z.array(savedItemSchema),
});

/** Respuesta de guardar, abrir, actualizar y clonar: el armado y su evaluación actual. */
export const savedBuildResponseSchema = z.object({
  build: savedBuildSchema,
  evaluation: evaluationSchema,
});

export const buildSummarySchema = z.object({
  id: z.guid(),
  name: z.string(),
  shareCode: z.string(),
  estimatedWatts: z.number().nullable(),
  totalPriceCop: z.number(),
  itemCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const buildListResponseSchema = z.object({ items: z.array(buildSummarySchema) });

export const wishlistParamsSchema = z.object({ componentId: z.guid() });

export const wishlistItemSchema = z.object({
  componentId: z.guid(),
  category: componentCategorySchema,
  brand: z.string(),
  model: z.string(),
  displayName: z.string(),
  minPriceCop: z.number().nullable(),
  offersCount: z.number(),
  addedAt: z.string(),
});

export const wishlistResponseSchema = z.object({ items: z.array(wishlistItemSchema) });
