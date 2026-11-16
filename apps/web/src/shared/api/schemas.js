import { z } from 'zod';

/*
 * ESQUEMAS PROVISIONALES de tienda.
 * Las ofertas ya vienen de @hw/contracts (offerListResponseSchema). El endpoint GET /stores todavía
 * no existe en la API: cuando Erick publique su esquema en @hw/contracts, se borra este archivo.
 * Las respuestas se leen con `looseObject`: un campo nuevo del backend no rompe la pantalla.
 */

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
