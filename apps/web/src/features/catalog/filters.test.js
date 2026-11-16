import { describe, expect, it } from 'vitest';
import {
  activeChips,
  applyPatch,
  clearFilters,
  countFilters,
  DEFAULT_SORT,
  PAGE_SIZE,
  parseFilters,
  toApiQuery,
  toSearchParams,
} from './filters.js';

const parse = (query) => parseFilters(new URLSearchParams(query));

describe('parseFilters', () => {
  it('sin parámetros no hay filtros y el orden es el más reciente', () => {
    const filters = parse('');
    expect(filters).toMatchObject({ sort: DEFAULT_SORT, category: undefined, q: undefined });
    expect(countFilters(filters)).toBe(0);
  });

  it('lee categoría, búsqueda, precio, condición, ciudad y orden', () => {
    expect(
      parse(
        'category=cpu&q=%20ryzen%207%20&minPrice=200000&maxPrice=4500000&condition=new&city=Cali&sort=price_asc',
      ),
    ).toMatchObject({
      category: 'cpu',
      q: 'ryzen 7',
      minPrice: '200000',
      maxPrice: '4500000',
      condition: 'new',
      city: 'Cali',
      sort: 'price_asc',
    });
  });

  it('descarta valores inválidos en vez de romper', () => {
    const filters = parse(
      'category=monitor&condition=roto&sort=relevancia&minPrice=abc&maxPrice=-5',
    );
    expect(filters).toMatchObject({
      category: undefined,
      condition: undefined,
      sort: DEFAULT_SORT,
      minPrice: undefined,
      maxPrice: undefined,
    });
  });

  it('un rango de precio invertido descarta el máximo (la API lo rechazaría)', () => {
    expect(parse('minPrice=900000&maxPrice=100000')).toMatchObject({
      minPrice: '900000',
      maxPrice: undefined,
    });
  });

  it('acepta atributos técnicos repetidos o separados por comas, sin duplicados', () => {
    expect(parse('category=cpu&socket=AM5&socket=AM4').socket).toEqual(['AM5', 'AM4']);
    expect(parse('category=cpu&socket=AM5,AM4,AM5').socket).toEqual(['AM5', 'AM4']);
  });

  it('descarta los atributos que no existen para la categoría o sin categoría', () => {
    expect(parse('socket=AM5').socket).toEqual([]);
    expect(parse('category=gpu&socket=AM5').socket).toEqual([]);
    expect(parse('category=cpu&socket=SocketInventado').socket).toEqual([]);
    expect(parse('category=psu&min_wattage_w=750').min_wattage_w).toBe('750');
    expect(parse('category=psu&min_wattage_w=9999').min_wattage_w).toBeUndefined();
  });
});

describe('toSearchParams', () => {
  it('omite lo vacío y el orden por defecto, y repite las listas', () => {
    const filters = parse('category=motherboard&socket=AM5&socket=LGA 1700&ram_type=DDR5&q=');
    expect(toSearchParams(filters).toString()).toBe(
      'category=motherboard&socket=AM5&socket=LGA+1700&ram_type=DDR5',
    );
  });

  it('conserva el orden cuando no es el de por defecto', () => {
    expect(toSearchParams(parse('sort=price_desc')).toString()).toBe('sort=price_desc');
  });

  it('ida y vuelta: lo que se escribe en la URL se lee igual', () => {
    const filters = parse(
      'category=case&supports_form_factor=Mini-ITX&condition=used&city=Bogot%C3%A1&sort=price_asc',
    );
    expect(parseFilters(toSearchParams(filters))).toEqual(filters);
  });
});

describe('applyPatch', () => {
  it('cambia un filtro sin tocar los demás', () => {
    const next = applyPatch(parse('category=cpu&socket=AM5'), { city: 'Cali' });
    expect(next).toMatchObject({ category: 'cpu', city: 'Cali', socket: ['AM5'] });
  });

  it('al cambiar de categoría se descartan los atributos técnicos de la anterior', () => {
    const next = applyPatch(parse('category=cpu&socket=AM5'), { category: 'ram' });
    expect(next.category).toBe('ram');
    expect(next.socket).toEqual([]);
  });

  it('volver a la misma categoría conserva los atributos', () => {
    const next = applyPatch(parse('category=cpu&socket=AM5'), { category: 'cpu' });
    expect(next.socket).toEqual(['AM5']);
  });

  it('quitar la categoría quita todos los atributos técnicos', () => {
    const next = applyPatch(parse('category=cpu&socket=AM5'), { category: undefined });
    expect(next.socket).toEqual([]);
  });
});

describe('clearFilters', () => {
  it('quita los filtros pero conserva la búsqueda y el orden', () => {
    const cleared = clearFilters(parse('q=ryzen&category=cpu&condition=new&sort=price_asc'));
    expect(toSearchParams(cleared).toString()).toBe('q=ryzen&sort=price_asc');
  });
});

describe('toApiQuery', () => {
  it('siempre pide el orden, las especificaciones y el tamaño de página', () => {
    expect(toApiQuery(parse(''))).toEqual({
      category: undefined,
      q: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      condition: undefined,
      city: undefined,
      sort: DEFAULT_SORT,
      includeSpecs: true,
      limit: PAGE_SIZE,
    });
  });

  it('incluye los atributos técnicos con valor y omite los vacíos', () => {
    const query = toApiQuery(parse('category=motherboard&socket=AM5&ram_type=DDR5'));
    expect(query).toMatchObject({ category: 'motherboard', socket: ['AM5'], ram_type: ['DDR5'] });
    expect('form_factor' in query).toBe(false);
  });
});

describe('activeChips', () => {
  it('describe cada filtro activo con el cambio que lo quita', () => {
    const filters = parse(
      'category=cpu&city=Bogot%C3%A1&condition=new&socket=AM5&minPrice=200000&maxPrice=4500000',
    );
    const chips = activeChips(filters);
    expect(chips.map((chip) => chip.label)).toEqual([
      'Categoría: Procesadores',
      'Ciudad: Bogotá',
      'Condición: Nuevo',
      'Precio: $ 200.000 – $ 4.500.000',
      'Socket de la placa base: AM5',
    ]);
    expect(applyPatch(filters, chips[1].patch).city).toBeUndefined();
    expect(applyPatch(filters, chips[3].patch)).toMatchObject({
      minPrice: undefined,
      maxPrice: undefined,
    });
  });

  it('quita un valor de una lista sin quitar los otros', () => {
    const filters = parse('category=cpu&socket=AM5&socket=AM4');
    const chip = activeChips(filters).find((item) => item.id === 'socket:AM5');
    expect(applyPatch(filters, chip.patch).socket).toEqual(['AM4']);
  });

  it('un precio solo con mínimo o solo con máximo se dice con "Desde" y "Hasta"', () => {
    expect(activeChips(parse('minPrice=500000'))[0].label).toBe('Precio: Desde $ 500.000');
    expect(activeChips(parse('maxPrice=500000'))[0].label).toBe('Precio: Hasta $ 500.000');
  });
});
