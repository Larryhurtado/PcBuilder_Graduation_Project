import { describe, expect, it } from 'vitest';
import {
  offerDetailSchema,
  offerListResponseSchema,
  offersQuerySchema,
  technicalFilterKeys,
} from './index.js';

const parse = (query) => offersQuerySchema.safeParse(query);
const ID = '6b03b443-7b22-491c-b301-7e2a285359df';

describe('offersQuerySchema', () => {
  it('sin parámetros aplica los valores por defecto', () => {
    expect(parse({}).data).toEqual({ sort: 'newest', limit: 20, includeSpecs: false });
  });

  it('convierte textos a números, booleanos y listas', () => {
    const { data } = parse({
      category: 'case',
      brandId: '3',
      minPrice: '1000',
      limit: '10',
      includeSpecs: 'true',
      supports_form_factor: 'Micro ATX',
      min_gpu_length_mm: '338',
    });
    expect(data).toMatchObject({
      category: 'case',
      brandId: 3,
      minPrice: 1000,
      limit: 10,
      includeSpecs: true,
      supports_form_factor: 'Micro ATX',
      min_gpu_length_mm: 338,
    });
  });

  it('las listas aceptan "a,b" y parámetros repetidos y descartan vacíos', () => {
    expect(parse({ category: 'motherboard', socket: 'AM5, LGA 1700,' }).data.socket).toEqual([
      'AM5',
      'LGA 1700',
    ]);
    expect(parse({ category: 'ram', ram_type: ['DDR4', 'DDR5'] }).data.ram_type).toEqual([
      'DDR4',
      'DDR5',
    ]);
  });

  it('cualquier filtro técnico exige category', () => {
    for (const key of technicalFilterKeys) {
      const value = key.endsWith('_mm') || key.endsWith('_w') ? '100' : 'x';
      expect(parse({ [key]: value }).success, key).toBe(false);
      expect(parse({ category: 'cpu', [key]: value }).success, key).toBe(true);
    }
  });

  it('rechaza límites, precios y rangos inválidos', () => {
    expect(parse({ limit: '0' }).success).toBe(false);
    expect(parse({ limit: '51' }).success).toBe(false);
    expect(parse({ minPrice: '-5' }).success).toBe(false);
    expect(parse({ minPrice: '500', maxPrice: '100' }).success).toBe(false);
    expect(parse({ minPrice: '100', maxPrice: '100' }).success).toBe(true);
    expect(parse({ sort: 'aleatorio' }).success).toBe(false);
    expect(parse({ includeSpecs: 'si' }).success).toBe(false);
  });

  it('las claves de los filtros técnicos son las que devuelve constraintsFor del motor', () => {
    expect(technicalFilterKeys).toEqual([
      'socket',
      'ram_type',
      'form_factor',
      'cooler_socket',
      'max_height_mm',
      'max_length_mm',
      'supports_form_factor',
      'min_gpu_length_mm',
      'min_cooler_height_mm',
      'min_wattage_w',
    ]);
  });
});

const item = {
  offerId: ID,
  priceCop: 849000,
  condition: 'new',
  warrantyMonths: 12,
  publishedAt: '2026-11-10T15:04:05.000Z',
  coverImageUrl: null,
  component: {
    id: ID,
    category: 'cpu',
    brand: 'AMD',
    model: '7600',
    displayName: 'AMD Ryzen 5 7600',
  },
  store: {
    id: ID,
    name: 'TecnoPasarela Cali',
    city: 'Cali',
    department: 'Valle del Cauca',
    commercialCenter: 'C.C. Pasarela',
    whatsappE164: '+573000000001',
  },
};

describe('esquemas de respuesta', () => {
  it('el listado acepta ofertas con y sin specs y un cursor nulo', () => {
    const withSpecs = { ...item, component: { ...item.component, specs: { socket: 'AM5' } } };
    expect(
      offerListResponseSchema.safeParse({ items: [item, withSpecs], nextCursor: null }).success,
    ).toBe(true);
    expect(offerListResponseSchema.safeParse({ items: [item], nextCursor: 'abc' }).success).toBe(
      true,
    );
  });

  it('el listado rechaza campos extra (no se filtran columnas internas)', () => {
    const extra = { ...item, storeId: ID };
    expect(offerListResponseSchema.safeParse({ items: [extra], nextCursor: null }).success).toBe(
      false,
    );
  });

  it('el precio debe ser un entero', () => {
    expect(
      offerListResponseSchema.safeParse({
        items: [{ ...item, priceCop: 849000.5 }],
        nextCursor: null,
      }).success,
    ).toBe(false);
  });

  it('el detalle exige descripción, fotos y la ubicación del local', () => {
    const detail = {
      ...item,
      description: null,
      images: [{ url: '/storage/a.jpg', position: 1, altText: null }],
      store: { ...item.store, address: 'Local 214', latitude: 3.4516, longitude: -76.532 },
    };
    expect(offerDetailSchema.safeParse(detail).success).toBe(true);
    expect(offerDetailSchema.safeParse(item).success).toBe(false);
  });
});
