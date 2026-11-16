import { componentCategorySchema } from '@hw/contracts';
import { z } from 'zod';

/*
 * ESQUEMAS PROVISIONALES de oferta y tienda.
 * Las formas salen de la sección 9 de docs/contexto-frontend.md ([Propuesto]). Cuando Erick
 * publique estos esquemas en @hw/contracts, se borra este archivo y se importan desde allí.
 * Las respuestas se leen con `looseObject`: un campo nuevo del backend no rompe la pantalla.
 */

export const storeSummarySchema = z.looseObject({
  id: z.guid(),
  name: z.string(),
  city: z.string(),
  department: z.string().nullable(),
  commercialCenter: z.string().nullable(),
  whatsappE164: z.string().nullable(),
});

export const offerSchema = z.looseObject({
  offerId: z.guid(),
  priceCop: z.number().int().positive(),
  condition: z.enum(['new', 'used']),
  warrantyMonths: z.number().int().nullable(),
  publishedAt: z.string(),
  coverImageUrl: z.string().nullable(),
  component: z.looseObject({
    id: z.guid(),
    category: componentCategorySchema,
    brand: z.string(),
    model: z.string(),
    displayName: z.string(),
    specs: z.record(z.string(), z.unknown()).nullable(),
  }),
  store: storeSummarySchema,
});

export const featuredOffersSchema = z.looseObject({ items: z.array(offerSchema) });

export const storeCardSchema = z.looseObject({
  id: z.guid(),
  tradeName: z.string(),
  description: z.string().nullable(),
  city: z.string(),
  department: z.string().nullable(),
  commercialCenter: z.string().nullable(),
  address: z.string().nullable(),
  isVerified: z.boolean(),
});

export const storesPageSchema = z.looseObject({
  items: z.array(storeCardSchema),
  nextCursor: z.string().nullable(),
});
