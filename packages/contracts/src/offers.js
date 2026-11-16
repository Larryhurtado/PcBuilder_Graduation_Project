import { z } from 'zod';
import { componentCategorySchema } from './catalog.js';

const int = z.number().int();
const coerceInt = z.coerce.number().int();

/** "a,b" o parámetro repetido (?x=a&x=b) → ['a', 'b']. */
const list = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    (Array.isArray(value) ? value : value.split(',')).map((v) => v.trim()).filter(Boolean),
  );

export const offerSortValues = ['price_asc', 'price_desc', 'newest'];

/**
 * Filtros técnicos de GET /offers. Son las mismas claves que devuelve `constraintsFor` del motor
 * de compatibilidad, y exigen `category`. Una pieza con el dato desconocido NO se oculta.
 */
export const technicalFilterKeys = [
  'socket', // cpu, motherboard
  'ram_type', // motherboard, ram
  'form_factor', // motherboard
  'cooler_socket', // cooler
  'max_height_mm', // cooler: altura máxima del disipador
  'max_length_mm', // gpu: longitud máxima de la GPU
  'supports_form_factor', // case: formato de placa que debe admitir
  'min_gpu_length_mm', // case: longitud de GPU que debe admitir
  'min_cooler_height_mm', // case: altura de disipador que debe admitir
  'min_wattage_w', // psu: potencia mínima
];

/** Parámetros de consulta de GET /offers (se valida igual en el servidor y en el frontend). */
export const offersQuerySchema = z
  .object({
    category: componentCategorySchema.optional(),
    brandId: coerceInt.positive().optional(),
    componentId: z.guid().optional(),
    q: z.string().trim().min(1).max(80).optional(),
    minPrice: coerceInt.min(0).optional(),
    maxPrice: coerceInt.min(0).optional(),
    condition: z.enum(['new', 'used']).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    commercialCenter: z.string().trim().min(1).max(80).optional(),
    storeId: z.guid().optional(),
    sort: z.enum(offerSortValues).default('newest'),
    limit: coerceInt.min(1).max(50).default(20),
    cursor: z.string().max(300).optional(),
    /** `true` agrega `component.specs` a cada oferta (lo necesita el armador para evaluar). */
    includeSpecs: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default(false),

    socket: list.optional(),
    ram_type: list.optional(),
    form_factor: list.optional(),
    cooler_socket: list.optional(),
    max_height_mm: coerceInt.positive().optional(),
    max_length_mm: coerceInt.positive().optional(),
    supports_form_factor: z.string().trim().min(1).max(40).optional(),
    min_gpu_length_mm: coerceInt.positive().optional(),
    min_cooler_height_mm: coerceInt.positive().optional(),
    min_wattage_w: coerceInt.positive().optional(),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { message: 'minPrice no puede ser mayor que maxPrice', path: ['minPrice'] },
  )
  .refine(
    (query) =>
      query.category !== undefined || technicalFilterKeys.every((k) => query[k] === undefined),
    { message: 'category es obligatoria cuando se usan filtros técnicos', path: ['category'] },
  );

const storeBase = {
  id: z.guid(),
  name: z.string(),
  city: z.string().nullable(),
  department: z.string().nullable(),
  commercialCenter: z.string().nullable(),
  whatsappE164: z.string().nullable(),
};

const componentBase = {
  id: z.guid(),
  category: componentCategorySchema,
  brand: z.string(),
  model: z.string(),
  displayName: z.string(),
};

const offerBase = {
  offerId: z.guid(),
  /** Entero en pesos colombianos (COP). */
  priceCop: int,
  condition: z.enum(['new', 'used']),
  warrantyMonths: int,
  publishedAt: z.string(),
  /** `null` mientras la oferta no tenga fotos: el frontend usa una imagen de relleno. */
  coverImageUrl: z.string().nullable(),
};

/** Oferta en un listado (GET /offers, GET /offers/featured). */
export const offerListItemSchema = z.strictObject({
  ...offerBase,
  component: z.strictObject({
    ...componentBase,
    /** Solo con includeSpecs=true; la forma depende de la categoría (ver specsSchemaByCategory). */
    specs: z.record(z.string(), z.unknown()).optional(),
  }),
  store: z.strictObject(storeBase),
});

export const offerListResponseSchema = z.strictObject({
  items: z.array(offerListItemSchema),
  /** Cursor opaco para pedir la página siguiente; `null` en la última. */
  nextCursor: z.string().nullable(),
});

export const featuredOffersResponseSchema = z.strictObject({
  items: z.array(offerListItemSchema),
});

/** Detalle de una oferta (GET /offers/{id}). */
export const offerDetailSchema = z.strictObject({
  ...offerBase,
  description: z.string().nullable(),
  images: z.array(
    z.strictObject({ url: z.string(), position: int, altText: z.string().nullable() }),
  ),
  component: z.strictObject(componentBase),
  store: z.strictObject({
    ...storeBase,
    address: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  }),
});
