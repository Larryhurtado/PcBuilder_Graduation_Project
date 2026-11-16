import { offerListResponseSchema } from '@hw/contracts';
import { constraintsFor } from '@hw/compat-engine';
import { describe, expect, it } from 'vitest';
import { featuredOffers, searchOffers } from './catalog.js';
import { findOffer } from './data.js';

const search = (query) => searchOffers(new URLSearchParams(query));
const names = (result) => result.items.map((item) => item.component.displayName);

describe('searchOffers (imita GET /offers)', () => {
  it('cumple el contrato de @hw/contracts, con y sin especificaciones', () => {
    expect(offerListResponseSchema.safeParse(search({})).success).toBe(true);
    expect(offerListResponseSchema.safeParse(search({ includeSpecs: 'true' })).success).toBe(true);
  });

  it('solo trae las especificaciones con includeSpecs=true', () => {
    expect(search({ limit: 1 }).items[0].component.specs).toBeUndefined();
    expect(search({ limit: 1, includeSpecs: 'true' }).items[0].component.specs).toBeDefined();
  });

  it('filtra por categoría, condición, ciudad y texto', () => {
    expect(search({ category: 'cpu' }).items.every((i) => i.component.category === 'cpu')).toBe(
      true,
    );
    expect(names(search({ condition: 'used' }))).toEqual([
      expect.stringContaining('Kingston HyperX'),
    ]);
    expect(search({ city: 'bogotá' }).items.every((i) => i.store.city === 'Bogotá')).toBe(true);
    expect(names(search({ q: 'x3d' }))).toEqual(['AMD Ryzen 7 7800X3D']);
  });

  it('filtra por rango de precio y lo ordena', () => {
    const result = search({
      category: 'ram',
      minPrice: 200000,
      maxPrice: 480000,
      sort: 'price_desc',
    });
    expect(result.items.map((i) => i.priceCop)).toEqual([469000]);
    const asc = search({ category: 'gpu', sort: 'price_asc' }).items.map((i) => i.priceCop);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
  });

  it('ordena por más recientes por defecto', () => {
    const dates = search({}).items.map((i) => i.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('pagina con cursor sin repetir ni perder ofertas', () => {
    const first = search({ limit: 5 });
    expect(first.items).toHaveLength(5);
    expect(first.nextCursor).not.toBeNull();
    const second = search({ limit: 5, cursor: first.nextCursor });
    const seen = new Set([...first.items, ...second.items].map((i) => i.offerId));
    expect(seen.size).toBe(10);
    const all = search({ limit: 50 });
    expect(all.nextCursor).toBeNull();
  });

  it('CP-06: los filtros de constraintsFor dejan solo las placas AM5', () => {
    const cpu = findOffer('AMD Ryzen 5 7600', 'TecnoPasarela Cali').component.specs;
    const query = {
      category: 'motherboard',
      includeSpecs: 'true',
      ...constraintsFor('motherboard', { cpu }),
    };
    const result = search(query);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((i) => i.component.specs.socket === 'AM5')).toBe(true);
  });

  it('los sockets se comparan sin importar espacios ni mayúsculas', () => {
    expect(names(search({ category: 'cpu', socket: 'lga1700' }))).toEqual([
      expect.stringContaining('12400F'),
    ]);
  });

  it('un dato desconocido no oculta la pieza (se mostrará como no verificable)', () => {
    // la H510 no declara altura máxima de disipador: pasa el filtro de altura
    const result = search({ category: 'case', min_cooler_height_mm: 200 });
    expect(names(result)).toEqual([expect.stringContaining('NZXT H510')]);
  });

  it('filtra cajas por la GPU que deben admitir y por el formato de placa', () => {
    expect(names(search({ category: 'case', min_gpu_length_mm: 338 }))).not.toContainEqual(
      expect.stringContaining('NR200P'),
    );
    expect(names(search({ category: 'case', supports_form_factor: 'Mini-ITX' })).length).toBe(3);
    expect(names(search({ category: 'case', supports_form_factor: 'EATX' }))).toEqual([
      expect.stringContaining('4000D'),
    ]);
  });

  it('filtra fuentes por potencia mínima, GPU por longitud y disipadores por socket y altura', () => {
    expect(search({ category: 'psu', min_wattage_w: 800 }).items).toHaveLength(0);
    expect(search({ category: 'psu', min_wattage_w: 750 }).items).toHaveLength(2);
    expect(names(search({ category: 'gpu', max_length_mm: 300 }))).toEqual([
      expect.stringContaining('RTX 4070 SUPER'),
    ]);
    expect(
      search({ category: 'cooler', cooler_socket: 'AM5', max_height_mm: 150 }).items,
    ).toHaveLength(0);
    expect(
      search({ category: 'cooler', cooler_socket: 'AM5', max_height_mm: 160 }).items,
    ).toHaveLength(2);
  });

  it('filtra placas por tipo de RAM y RAM por tipo', () => {
    expect(search({ category: 'ram', ram_type: 'DDR4' }).items).toHaveLength(1);
    expect(
      search({ category: 'motherboard', ram_type: 'DDR5', form_factor: 'ATX' }).items,
    ).toHaveLength(1);
  });

  it('acepta listas separadas por comas y parámetros repetidos', () => {
    const csv = search({ category: 'cpu', socket: 'AM4,LGA 1700' });
    const repeated = searchOffers(
      new URLSearchParams([
        ['category', 'cpu'],
        ['socket', 'AM4'],
        ['socket', 'LGA 1700'],
      ]),
    );
    expect(names(csv)).toEqual(names(repeated));
    expect(csv.items).toHaveLength(2);
  });

  it('filtra por tienda y por componente', () => {
    const offer = findOffer('Corsair 4000D');
    expect(
      search({ storeId: offer.store.id }).items.every((i) => i.store.id === offer.store.id),
    ).toBe(true);
    expect(search({ componentId: offer.component.id }).items).toHaveLength(1);
  });
});

describe('featuredOffers (imita GET /offers/featured)', () => {
  it('trae las más recientes, sin especificaciones, como la API', () => {
    const { items } = featuredOffers(3);
    expect(items).toHaveLength(3);
    expect(items[0].component.specs).toBeUndefined();
  });
});
