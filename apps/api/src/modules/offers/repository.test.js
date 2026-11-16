import { describe, expect, it, vi } from 'vitest';
import { buildSearchQuery, createOffersRepository } from './repository.js';

const ID = '6b03b443-7b22-491c-b301-7e2a285359df';
const build = (input) => buildSearchQuery({ sort: 'newest', limit: 21, ...input });

describe('buildSearchQuery: filtros generales', () => {
  it('sin filtros lista todo por fecha con el límite como parámetro', () => {
    const { text, params } = build({});
    expect(text).toContain('FROM readmodel.public_offers po');
    expect(text).toContain('ORDER BY po.published_at DESC, po.offer_id DESC');
    expect(text).not.toContain('WHERE');
    expect(params).toEqual([21]);
  });

  it('combina varios filtros con AND y numera los parámetros', () => {
    const { text, params } = build({
      filters: {
        category: 'gpu',
        minPrice: 1000,
        maxPrice: 2000,
        condition: 'new',
        city: 'Cali',
        storeId: ID,
      },
    });
    expect(text).toMatch(
      /WHERE po\.category::text = \$1 AND po\.price_cop >= \$2 AND po\.price_cop <= \$3/,
    );
    expect(params).toEqual(['gpu', 1000, 2000, 'new', 'Cali', ID, 21]);
  });

  it('la búsqueda de texto escapa los comodines y nunca entra en el SQL', () => {
    const { text, params } = build({ filters: { q: '50%_off' } });
    expect(params.slice(0, 3)).toEqual(['%50\\%\\_off%', '%50\\%\\_off%', '%50\\%\\_off%']);
    expect(text).not.toContain('50%');
  });

  it('el orden sale de una lista permitida', () => {
    expect(build({ sort: 'price_asc' }).text).toContain(
      'ORDER BY po.price_cop ASC, po.offer_id ASC',
    );
    expect(build({ sort: 'price_desc' }).text).toContain(
      'ORDER BY po.price_cop DESC, po.offer_id DESC',
    );
  });
});

describe('buildSearchQuery: cursor', () => {
  it('price_asc usa una comparación de filas hacia adelante', () => {
    const { text, params } = build({ sort: 'price_asc', cursor: { value: 849000, id: ID } });
    expect(text).toContain('(po.price_cop, po.offer_id) > ($1::numeric, $2::uuid)');
    expect(params).toEqual([849000, ID, 21]);
  });

  it('price_desc y newest comparan hacia atrás', () => {
    expect(build({ sort: 'price_desc', cursor: { value: 1, id: ID } }).text).toContain(
      '(po.price_cop, po.offer_id) < ($1::numeric, $2::uuid)',
    );
    const newest = build({
      sort: 'newest',
      cursor: { value: '2026-11-10 15:04:05.123456+00', id: ID },
    });
    expect(newest.text).toContain('(po.published_at, po.offer_id) < ($1::timestamptz, $2::uuid)');
  });
});

describe('buildSearchQuery: filtros técnicos', () => {
  it('socket de placa: compara el valor normalizado', () => {
    const { text, params } = build({ filters: { category: 'motherboard', socket: ['AM5'] } });
    expect(text).toContain(
      "lower(regexp_replace(a.socket::text, '[\\s_-]', '', 'g')) = ANY($2::text[])",
    );
    expect(params[1]).toEqual(['am5']);
  });

  it('normaliza los valores recibidos ("Micro ATX" → "microatx")', () => {
    const { params } = build({
      filters: { category: 'motherboard', form_factor: ['Micro ATX', 'Mini-ITX'] },
    });
    expect(params[1]).toEqual(['microatx', 'miniitx']);
  });

  it('los filtros de medida dejan pasar las piezas con el dato desconocido (NULL)', () => {
    const cooler = build({ filters: { category: 'cooler', max_height_mm: 160 } }).text;
    expect(cooler).toContain('(a.cooler_height_mm IS NULL OR a.cooler_height_mm <= $2)');
    const gpu = build({ filters: { category: 'gpu', max_length_mm: 330 } }).text;
    expect(gpu).toContain('(a.gpu_length_mm IS NULL OR a.gpu_length_mm <= $2)');
    const pcCase = build({
      filters: { category: 'case', min_gpu_length_mm: 338, min_cooler_height_mm: 155 },
    }).text;
    expect(pcCase).toContain('(a.max_gpu_length_mm IS NULL OR a.max_gpu_length_mm >= $2)');
    expect(pcCase).toContain('(a.max_cooler_height_mm IS NULL OR a.max_cooler_height_mm >= $3)');
  });

  it('un disipador sin sockets registrados no se oculta', () => {
    const { text } = build({ filters: { category: 'cooler', cooler_socket: ['AM5'] } });
    expect(text).toContain('a.cooler_sockets IS NULL OR EXISTS');
  });

  it('fuente: potencia mínima', () => {
    expect(build({ filters: { category: 'psu', min_wattage_w: 375 } }).text).toContain(
      'a.psu_wattage_w >= $2',
    );
  });

  it('un filtro técnico que no corresponde a la categoría se ignora', () => {
    const { text, params } = build({
      filters: { category: 'gpu', socket: ['AM5'], min_wattage_w: 500 },
    });
    expect(text).not.toContain('a.socket');
    expect(text).not.toContain('psu_wattage');
    expect(params).toEqual(['gpu', 21]);
  });
});

describe('createOffersRepository', () => {
  it('search devuelve las filas de la consulta', async () => {
    const db = { query: vi.fn(async () => ({ rows: [{ offerId: ID }] })) };
    const rows = await createOffersRepository(db).search({ sort: 'newest', limit: 5 });
    expect(rows).toEqual([{ offerId: ID }]);
    expect(db.query.mock.calls[0][1]).toEqual([5]);
  });

  it('findPublicById devuelve null si no hay fila', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    expect(await createOffersRepository(db).findPublicById(ID)).toBeNull();
  });
});
