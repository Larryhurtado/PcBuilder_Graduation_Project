import { z } from 'zod';
import { componentCategorySchema } from './catalog.js';

const MAX_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const imageMimeTypes = ['image/jpeg', 'image/png'];

const priceCop = z
  .number()
  .int('El precio debe ser un número entero')
  .positive('El precio debe ser mayor que 0')
  .max(999_999_999_999, 'Máximo 12 dígitos');
const warrantyMonths = z.number().int().min(0).max(120);
const description = z.string().trim().max(1000).nullable();
const imageKeys = z.array(z.string().min(1).max(300)).max(MAX_IMAGES, 'Máximo 5 fotos');

/** Crear oferta: el vendedor solo completa precio, estado, garantía, descripción y fotos. */
export const createOfferBodySchema = z.strictObject({
  componentId: z.guid(),
  priceCop,
  condition: z.enum(['new', 'used']),
  warrantyMonths: warrantyMonths.default(0),
  description: description.default(null),
  imageKeys: imageKeys.default([]),
});

/** Editar oferta: el producto y su estado (nuevo/usado) no cambian; para eso se publica otra. */
export const updateOfferBodySchema = z
  .strictObject({ priceCop, warrantyMonths, description, imageKeys })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Envía al menos un campo' });

export const visibilityBodySchema = z.strictObject({ status: z.enum(['active', 'paused']) });

export const offerIdParamsSchema = z.object({ id: z.guid() });

export const presignBodySchema = z.strictObject({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(imageMimeTypes, { error: 'La foto debe ser JPG o PNG' }),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES, 'Cada foto puede pesar hasta 5 MB'),
});

export const presignResponseSchema = z.object({
  uploadUrl: z.string(),
  storageKey: z.string(),
});

export const sellerOfferSchema = z.object({
  offerId: z.guid(),
  status: z.enum(['active', 'paused']),
  priceCop: z.number(),
  condition: z.enum(['new', 'used']),
  warrantyMonths: z.number(),
  description: z.string().nullable(),
  publishedAt: z.string(),
  updatedAt: z.string(),
  component: z.object({
    id: z.guid(),
    category: componentCategorySchema,
    brand: z.string(),
    model: z.string(),
    displayName: z.string(),
  }),
  images: z.array(z.object({ key: z.string(), url: z.string(), position: z.number() })),
});

export const sellerOfferResponseSchema = z.object({ offer: sellerOfferSchema });
export const sellerOffersResponseSchema = z.object({ items: z.array(sellerOfferSchema) });

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha en formato AAAA-MM-DD');

/** Rango del panel (días en hora de Colombia). Por defecto, los últimos 7 días; máximo 90. */
export const analyticsSummaryQuerySchema = z
  .object({ from: day.optional(), to: day.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" no puede ser posterior a "to"',
  });

export const analyticsSummarySchema = z.object({
  totals: z.object({
    views: z.number(),
    whatsappClicks: z.number(),
    activeOffers: z.number(),
    pausedOffers: z.number(),
  }),
  daily: z.array(z.object({ day: day, views: z.number(), whatsappClicks: z.number() })),
});
