import { describe, expect, it } from 'vitest';
import { filterOffers, PAGE_SIZE, pageWindow, summarize } from './inventory.js';

const offer = (displayName, { component, ...rest } = {}) => ({
  offerId: displayName,
  status: 'active',
  priceCop: 100_000,
  ...rest,
  component: { category: 'cpu', brand: 'AMD', model: displayName, displayName, ...component },
});

const list = [
  offer('AMD Ryzen 5 7600', { priceCop: 800_000 }),
  offer('Memoria Corsair Vengeance', {
    priceCop: 400_000,
    status: 'paused',
    component: { category: 'ram', brand: 'Corsair' },
  }),
  offer('Tarjeta gráfica RTX', {
    priceCop: 3_000_000,
    component: { category: 'gpu', brand: 'ASUS' },
  }),
];

describe('filterOffers', () => {
  it('sin filtros devuelve todo en el mismo orden', () => {
    expect(filterOffers(list)).toEqual(list);
  });

  it('busca por nombre, marca o modelo sin importar mayúsculas', () => {
    expect(filterOffers(list, { q: 'corsair' })).toHaveLength(1);
    expect(filterOffers(list, { q: 'RYZEN' })).toHaveLength(1);
    expect(filterOffers(list, { q: 'asus' })[0].component.category).toBe('gpu');
  });

  it('no distingue tildes: "grafica" encuentra "gráfica"', () => {
    expect(filterOffers(list, { q: 'grafica' })).toHaveLength(1);
    expect(filterOffers(list, { q: 'gráfica' })).toHaveLength(1);
  });

  it('filtra por estado y por categoría, y combina los filtros', () => {
    expect(filterOffers(list, { status: 'paused' })).toHaveLength(1);
    expect(filterOffers(list, { status: 'active' })).toHaveLength(2);
    expect(filterOffers(list, { category: 'ram' })).toHaveLength(1);
    expect(filterOffers(list, { status: 'paused', category: 'cpu' })).toHaveLength(0);
  });

  it('ignora los espacios alrededor del texto buscado', () => {
    expect(filterOffers(list, { q: '  rtx  ' })).toHaveLength(1);
  });
});

describe('summarize', () => {
  it('cuenta activas y pausadas y calcula precio promedio y rango de las activas', () => {
    expect(summarize(list)).toEqual({
      active: 2,
      paused: 1,
      averagePrice: 1_900_000,
      minPrice: 800_000,
      maxPrice: 3_000_000,
    });
  });

  it('sin ofertas activas no inventa precios', () => {
    expect(summarize([list[1]])).toEqual({
      active: 0,
      paused: 1,
      averagePrice: null,
      minPrice: null,
      maxPrice: null,
    });
    expect(summarize([]).averagePrice).toBeNull();
  });
});

describe('pageWindow', () => {
  it('con pocas páginas las muestra todas', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('con muchas páginas deja la primera, la última y las vecinas de la actual', () => {
    expect(pageWindow(1, 12)).toEqual([1, 2, '…', 12]);
    expect(pageWindow(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
    expect(pageWindow(12, 12)).toEqual([1, '…', 11, 12]);
    expect(pageWindow(3, 12)).toEqual([1, 2, 3, 4, '…', 12]);
  });

  it('la lista es de a 10 ofertas', () => {
    expect(PAGE_SIZE).toBe(10);
  });
});
