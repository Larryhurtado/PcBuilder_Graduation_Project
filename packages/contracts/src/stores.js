import { z } from 'zod';
import { authResponseSchema } from './auth.js';

/** Celular colombiano en formato E.164: +57 seguido de 10 dígitos que empiezan en 3. */
export const whatsappE164Schema = z
  .string()
  .regex(/^\+573\d{9}$/, 'Debe ser un celular colombiano: +57 y 10 dígitos que empiezan en 3');

const legalName = z.string().trim().min(2).max(200);
const tradeName = z.string().trim().min(2).max(120);

export const verificationStatusValues = [
  'not_submitted',
  'pending_review',
  'correction_requested',
  'approved',
  'rejected',
  'suspended',
];

export const convertBodySchema = z.strictObject({ legalName, tradeName });

/** Todos los campos son opcionales, pero debe venir al menos uno. Los que exige la verificación no aceptan null. */
export const updateStoreBodySchema = z
  .strictObject({
    legalName,
    tradeName,
    nit: z
      .string()
      .regex(/^[0-9]{8,10}-[0-9]$/, 'NIT con dígito de verificación, p. ej. 900123456-7'),
    description: z.string().trim().max(1000).nullable(),
    whatsappE164: whatsappE164Schema,
    department: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    address: z.string().trim().min(3).max(200),
    commercialCenter: z.string().trim().max(120).nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    openingHours: z.record(z.string(), z.unknown()).nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Envía al menos un campo' });

export const storeSchema = z.object({
  id: z.guid(),
  legalName: z.string(),
  tradeName: z.string(),
  nit: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  whatsappE164: z.string().nullable(),
  department: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  commercialCenter: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  openingHours: z.record(z.string(), z.unknown()).nullable(),
  isVerified: z.boolean(),
});

export const storeResponseSchema = z.object({ store: storeSchema });

/** Respuesta de POST /seller/convert: la tienda y la sesión nueva (token con rol vendedor). */
export const convertResponseSchema = authResponseSchema.extend({ store: storeSchema });

/** GET /stores: filtros opcionales sobre los comercios verificados. */
export const publicStoresQuerySchema = z.object({
  q: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/** GET /stores/{id} */
export const publicStoreParamsSchema = z.object({ id: z.guid() });

/** Lo que se muestra de un comercio verificado: nunca la razón social ni el NIT. */
export const publicStoreSchema = z.object({
  id: z.guid(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  department: z.string().nullable(),
  city: z.string().nullable(),
  commercialCenter: z.string().nullable(),
  address: z.string().nullable(),
  whatsappE164: z.string().nullable(),
  offersCount: z.number(),
});

export const publicStoresResponseSchema = z.object({ items: z.array(publicStoreSchema) });

export const verificationStatusSchema = z.object({
  status: z.enum(verificationStatusValues),
  submittedAt: z.string().nullable(),
  reviewerNote: z.string().nullable(),
  deadlineAt: z.string().nullable(),
  canReapplyAt: z.string().nullable(),
});
