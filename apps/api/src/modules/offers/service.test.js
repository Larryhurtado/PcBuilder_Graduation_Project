import { offerDetailSchema, offerListResponseSchema } from '@hw/contracts';
import { describe, expect, it, vi } from 'vitest';
import { createOffersService } from './service.js';

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const row = (n, overrides = {}) => ({
  offerId: uuid(n),
  priceCop: 100000 * n,
  itemCondition: 'new',
  warrantyMonths: 12,
  publishedAt: new Date(`2026-11-${String(10 + n).padStart(2, '0')}T12:00:00Z`),
  publishedAtRaw: `2026-11-${String(10 + n).padStart(2, '0')} 12:00:00.000001+00`,
  componentId: uuid(100 + n),
  category: 'cpu',
  brand: 'AMD',
  model: String(n),
  displayName: `AMD ${n}`,
  storeId: uuid(900),
  storeName: 'TecnoPasarela Cali',
  city: 'Cali',
  department: 'Valle del Cauca',
  commercialCenter: 'C.C. Pasarela',
  whatsappE164: '+573000000001',
  coverImageKey: null,
  ...overrides,
});

function setup({ rows = [], images = [], detail = null } = {}) {
  const repository = {
    search: vi.fn(async () => rows),
    findPublicById: vi.fn(async () => detail),
    findImages: vi.fn(async () => images),
  };
  const catalog = {
    getSpecs: vi.fn(
      async (ids) => new Map(ids.map((id) => [id, { specs: { socket: 'AM5', tdpW: 65 } }])),
    ),
  };
  return { repository, catalog, service: createOffersService({ repository, catalog }) };
}

const query = (extra = {}) => ({ sort: 'newest', limit: 2, includeSpecs: false, ...extra });

describe('offers service: search', () => {
  it('pide una fila de más y devuelve nextCursor solo si hay otra página', async () => {
    const { service, repository } = setup({ rows: [row(3), row(2), row(1)] });
    const page = await service.search(query());
    expect(repository.search.mock.calls[0][0]).toMatchObject({
      sort: 'newest',
      limit: 3,
      cursor: null,
    });
    expect(page.items.map((i) => i.offerId)).toEqual([uuid(3), uuid(2)]);
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it('en la última página nextCursor es null', async () => {
    const { service } = setup({ rows: [row(2), row(1)] });
    expect((await service.search(query())).nextCursor).toBeNull();
  });

  it('el nextCursor permite pedir la página siguiente con ese mismo orden', async () => {
    const first = setup({ rows: [row(3), row(2), row(1)] });
    const { nextCursor } = await first.service.search(query());
    const second = setup({ rows: [row(1)] });
    await second.service.search(query({ cursor: nextCursor }));
    expect(second.repository.search.mock.calls[0][0].cursor).toEqual({
      value: row(2).publishedAtRaw,
      id: uuid(2),
    });
  });

  it('un cursor inválido o de otro orden lanza VALIDATION_ERROR sin consultar', async () => {
    const { service, repository } = setup();
    await expect(service.search(query({ cursor: 'basura' }))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(repository.search).not.toHaveBeenCalled();
  });

  it('separa los filtros del orden, el límite y las opciones', async () => {
    const { service, repository } = setup();
    await service.search(query({ category: 'gpu', minPrice: 1, includeSpecs: true }));
    expect(repository.search.mock.calls[0][0].filters).toEqual({ category: 'gpu', minPrice: 1 });
  });

  it('da forma de oferta: condición, fecha ISO, tienda y foto nula', async () => {
    const { service } = setup({ rows: [row(1)] });
    const { items } = await service.search(query());
    expect(items[0]).toEqual({
      offerId: uuid(1),
      priceCop: 100000,
      condition: 'new',
      warrantyMonths: 12,
      publishedAt: '2026-11-11T12:00:00.000Z',
      coverImageUrl: null,
      component: { id: uuid(101), category: 'cpu', brand: 'AMD', model: '1', displayName: 'AMD 1' },
      store: {
        id: uuid(900),
        name: 'TecnoPasarela Cali',
        city: 'Cali',
        department: 'Valle del Cauca',
        commercialCenter: 'C.C. Pasarela',
        whatsappE164: '+573000000001',
      },
    });
    expect(offerListResponseSchema.safeParse({ items, nextCursor: null }).success).toBe(true);
  });

  it('con includeSpecs agrega component.specs con una sola consulta al catálogo', async () => {
    const { service, catalog } = setup({ rows: [row(1), row(2, { componentId: uuid(101) })] });
    const { items } = await service.search(query({ includeSpecs: true }));
    expect(items.every((i) => i.component.specs.socket === 'AM5')).toBe(true);
    expect(catalog.getSpecs).toHaveBeenCalledTimes(1);
    expect(catalog.getSpecs.mock.calls[0][0]).toEqual([uuid(101)]); // ids sin repetir
  });

  it('sin includeSpecs no consulta el catálogo ni agrega specs', async () => {
    const { service, catalog } = setup({ rows: [row(1)] });
    const { items } = await service.search(query());
    expect(catalog.getSpecs).not.toHaveBeenCalled();
    expect(items[0].component).not.toHaveProperty('specs');
  });

  it('la foto de portada se convierte en una dirección', async () => {
    const { service } = setup({ rows: [row(1, { coverImageKey: 'offers/a.jpg' })] });
    expect((await service.search(query())).items[0].coverImageUrl).toBe('/storage/offers/a.jpg');
  });
});

describe('offers service: featured', () => {
  it('devuelve las más recientes sin cursor ni especificaciones', async () => {
    const { service, repository } = setup({ rows: [row(2), row(1)] });
    const result = await service.featured(2);
    expect(repository.search).toHaveBeenCalledWith({ filters: {}, sort: 'newest', limit: 2 });
    expect(result.items).toHaveLength(2);
    expect(result).not.toHaveProperty('nextCursor');
  });
});

describe('offers service: getOffer', () => {
  it('una oferta inexistente (o no pública) lanza 404', async () => {
    const { service } = setup({ detail: null });
    await expect(service.getOffer(uuid(1))).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('devuelve descripción, fotos en orden y la ubicación del local', async () => {
    const detail = row(1, {
      description: 'Nuevo, sellado.',
      address: 'Local 214, C.C. Pasarela',
      latitude: 3.4516,
      longitude: -76.532,
    });
    const { service } = setup({
      detail,
      images: [
        { storageKey: 'a.jpg', position: 1, altText: 'frente' },
        { storageKey: 'b.jpg', position: 2, altText: null },
      ],
    });
    const offer = await service.getOffer(uuid(1));
    expect(offer.description).toBe('Nuevo, sellado.');
    expect(offer.images).toEqual([
      { url: '/storage/a.jpg', position: 1, altText: 'frente' },
      { url: '/storage/b.jpg', position: 2, altText: null },
    ]);
    expect(offer.store).toMatchObject({
      address: 'Local 214, C.C. Pasarela',
      latitude: 3.4516,
      longitude: -76.532,
    });
    expect(offerDetailSchema.safeParse(offer).success).toBe(true);
  });

  it('los datos opcionales ausentes llegan como null', async () => {
    const { service } = setup({ detail: row(1) });
    const offer = await service.getOffer(uuid(1));
    expect(offer.description).toBeNull();
    expect(offer.images).toEqual([]);
    expect(offer.store.address).toBeNull();
  });
});
