import { z } from 'zod';

/**
 * Especificaciones técnicas por categoría (camelCase, planas). Un dato desconocido es `null`:
 * el motor de compatibilidad lo trata como "no verificable" (ADR-04), nunca como cero.
 * Las columnas salen de las tablas catalog.*_specs.
 */
const int = z.number().int();

export const cpuSpecsSchema = z.strictObject({
  socket: z.string(),
  tdpW: int,
  cores: int.nullable(),
  threads: int.nullable(),
  baseClockGhz: z.number().nullable(),
  boostClockGhz: z.number().nullable(),
  memoryTypes: z.array(z.string()).nullable(),
  hasIntegratedGraphics: z.boolean().nullable(),
});

export const motherboardSpecsSchema = z.strictObject({
  socket: z.string(),
  formFactor: z.string(),
  chipset: z.string().nullable(),
  ramType: z.string(),
  ramSlots: int,
  ramMaxGb: int.nullable(),
  m2Slots: int,
});

export const ramSpecsSchema = z.strictObject({
  ramType: z.string(),
  speedMhz: int,
  modulesQty: int,
  capacityGb: int,
  formFactor: z.string().nullable(),
  casLatency: int.nullable(),
});

export const gpuSpecsSchema = z.strictObject({
  tdpW: int,
  lengthMm: int.nullable(),
  slotWidth: z.number().nullable(),
  interface: z.string().nullable(),
  memoryGb: int.nullable(),
  powerConnectors: z.record(z.string(), z.unknown()).nullable(),
});

export const psuSpecsSchema = z.strictObject({
  wattageW: int,
  formFactor: z.string().nullable(),
  efficiencyRating: z.string().nullable(),
  modular: z.string().nullable(),
  connectors: z.record(z.string(), z.unknown()).nullable(),
});

export const caseSpecsSchema = z.strictObject({
  formFactor: z.string().nullable(),
  supportedMbFormFactors: z.array(z.string()),
  supportedPsuFormFactors: z.array(z.string()).nullable(),
  maxGpuLengthMm: int.nullable(),
  maxCoolerHeightMm: int.nullable(),
});

export const coolerSpecsSchema = z.strictObject({
  heightMm: int.nullable(),
  waterCooled: z.boolean().nullable(),
  radiatorMm: int.nullable(),
  sockets: z.array(z.string()),
});

export const storageSpecsSchema = z.strictObject({
  storageType: z.string(),
  interface: z.string(),
  capacityGb: int,
  formFactor: z.string().nullable(),
});

/** Esquema de `specs` según la categoría del componente. */
export const specsSchemaByCategory = {
  cpu: cpuSpecsSchema,
  motherboard: motherboardSpecsSchema,
  ram: ramSpecsSchema,
  gpu: gpuSpecsSchema,
  psu: psuSpecsSchema,
  case: caseSpecsSchema,
  cooler: coolerSpecsSchema,
  storage: storageSpecsSchema,
};

const componentBase = {
  id: z.guid(),
  brand: z.string(),
  model: z.string(),
  displayName: z.string(),
  releaseYear: int.nullable(),
  /** Versión del dato en la Base de Datos Maestra. */
  version: int.min(1),
  updatedAt: z.string(),
  /** Fuente y licencia de los datos (atribución obligatoria de BuildCores). */
  source: z
    .strictObject({ name: z.string(), license: z.string(), attributionText: z.string() })
    .nullable(),
};

const variant = (category, specs) =>
  z.strictObject({ ...componentBase, category: z.literal(category), specs });

/** Componente del catálogo con sus especificaciones (GET /components/{id}). */
export const componentSchema = z.discriminatedUnion('category', [
  variant('cpu', cpuSpecsSchema),
  variant('motherboard', motherboardSpecsSchema),
  variant('ram', ramSpecsSchema),
  variant('gpu', gpuSpecsSchema),
  variant('psu', psuSpecsSchema),
  variant('case', caseSpecsSchema),
  variant('cooler', coolerSpecsSchema),
  variant('storage', storageSpecsSchema),
]);

/** Resultado del buscador global (GET /catalog/search). */
export const componentSearchItemSchema = z.strictObject({
  id: z.guid(),
  category: z.enum(['cpu', 'motherboard', 'ram', 'gpu', 'psu', 'case', 'cooler', 'storage']),
  brand: z.string(),
  model: z.string(),
  displayName: z.string(),
  minPriceCop: int.nullable(),
  offersCount: int,
});

export const componentSearchResponseSchema = z.strictObject({
  items: z.array(componentSearchItemSchema),
});
