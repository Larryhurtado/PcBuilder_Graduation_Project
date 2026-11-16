import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../kernel/errors.js';
import { createBuildsService, newShareCode } from './service.js';

const CPU = '00000000-0000-4000-8000-000000000001';
const MB = '00000000-0000-4000-8000-000000000002';
const OFFER = '00000000-0000-4000-8000-0000000000a1';
const ME = 'user-1';
const NOW = new Date('2026-11-16T15:00:00Z');

const evaluation = (incompatible = 0) => ({
  results: [
    incompatible
      ? { code: 'RC-01', status: 'fail', message: 'Sockets distintos' }
      : { code: 'RC-01', status: 'ok' },
  ],
  summary: { incompatible, unknown: 0, ok: incompatible ? 0 : 1 },
  estimatedWatts: 300,
  recommendedPsuW: 400,
});
const summaryOf = ({ category, componentId }) => ({
  category,
  componentId,
  brand: 'Marca',
  model: `M-${category}`,
  displayName: `Pieza ${category}`,
});

function setup({ incompatible = 0, rows = {}, storedItems } = {}) {
  const buildRow = (extra = {}) => ({
    id: 'b1',
    userId: ME,
    name: 'Mi PC',
    shareCode: 'Ab3dE9fG2h',
    estimatedWatts: 300,
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
  });
  const repository = {
    create: vi.fn(async () => 'b1'),
    replace: vi.fn(async () => true),
    remove: vi.fn(async () => true),
    findById: vi.fn(async () => buildRow(rows.byId)),
    findByShareCode: vi.fn(async () => buildRow(rows.byCode)),
    findOwnedById: vi.fn(async () => buildRow()),
    findItems: vi.fn(
      async () =>
        storedItems ?? [
          { category: 'cpu', componentId: CPU, offerId: OFFER, unitPriceCop: 1000000 },
          { category: 'motherboard', componentId: MB, offerId: null, unitPriceCop: null },
        ],
    ),
    listByUser: vi.fn(async () => [{ ...buildRow(), totalPriceCop: 1000000, itemCount: 2 }]),
    listWishlist: vi.fn(async () => []),
    addToWishlist: vi.fn(async () => {}),
    removeFromWishlist: vi.fn(async () => {}),
  };
  const compat = {
    validate: vi.fn(async (items) => ({
      ...evaluation(incompatible),
      items: items.map(summaryOf),
    })),
  };
  const offers = {
    getOffer: vi.fn(async () => ({ priceCop: 1250000, component: { id: CPU } })),
  };
  const catalog = { exists: vi.fn(async () => true) };
  const codes = ['CODIGO0001', 'CODIGO0002'];
  const service = createBuildsService({
    repository,
    compat,
    offers,
    catalog,
    newCode: () => codes.shift() ?? 'CODIGO9999',
  });
  return { service, repository, compat, offers, catalog };
}

const body = (extra = {}) => ({
  name: 'Mi PC',
  draft: false,
  items: [
    { category: 'cpu', componentId: CPU, offerId: OFFER },
    { category: 'motherboard', componentId: MB },
  ],
  ...extra,
});

describe('save', () => {
  it('valida con el motor, guarda el precio de la oferta y el consumo, y devuelve el armado', async () => {
    const { service, repository, compat, offers } = setup();
    const result = await service.save(ME, body());
    expect(compat.validate).toHaveBeenCalledWith([
      { category: 'cpu', componentId: CPU },
      { category: 'motherboard', componentId: MB },
    ]);
    expect(offers.getOffer).toHaveBeenCalledWith(OFFER);
    expect(repository.create).toHaveBeenCalledWith({
      userId: ME,
      name: 'Mi PC',
      estimatedWatts: 300,
      shareCode: 'CODIGO0001',
      items: [
        { category: 'cpu', componentId: CPU, offerId: OFFER, unitPriceCop: 1250000 },
        { category: 'motherboard', componentId: MB, offerId: null, unitPriceCop: null },
      ],
    });
    expect(result.build).toMatchObject({ id: 'b1', isOwner: true, shareCode: 'Ab3dE9fG2h' });
    expect(result.evaluation.summary).toEqual({ incompatible: 0, unknown: 0, ok: 1 });
    expect(result.evaluation).not.toHaveProperty('items');
  });

  it('sin sesión el armado queda anónimo (user_id nulo) y el lector no es el dueño', async () => {
    const { service, repository } = setup({ rows: { byId: { userId: null } } });
    const result = await service.save(null, body());
    expect(repository.create.mock.calls[0][0].userId).toBeNull();
    expect(result.build.isOwner).toBe(false);
  });

  it('con incompatibilidades se rechaza con 422 BUILD_INCOMPATIBLE y el detalle, sin guardar', async () => {
    const { service, repository } = setup({ incompatible: 1 });
    await expect(service.save(ME, body())).rejects.toMatchObject({
      code: 'BUILD_INCOMPATIBLE',
      status: 422,
      details: { incompatible: [{ code: 'RC-01', message: 'Sockets distintos' }] },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('como borrador (draft) se guarda aunque sea incompatible', async () => {
    const { service, repository } = setup({ incompatible: 1 });
    await service.save(ME, body({ draft: true }));
    expect(repository.create).toHaveBeenCalled();
  });

  it('una oferta de otro componente da 422; una no pública, 404, y no se guarda nada', async () => {
    const wrong = setup();
    wrong.offers.getOffer.mockResolvedValueOnce({ priceCop: 1, component: { id: MB } });
    await expect(wrong.service.save(ME, body())).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    const hidden = setup();
    hidden.offers.getOffer.mockRejectedValueOnce(new AppError('NOT_FOUND'));
    await expect(hidden.service.save(ME, body())).rejects.toMatchObject({ status: 404 });
    expect(wrong.repository.create).not.toHaveBeenCalled();
    expect(hidden.repository.create).not.toHaveBeenCalled();
  });

  it('si el código generado ya existe (409) reintenta con otro; tras 5 intentos se rinde', async () => {
    const { service, repository } = setup();
    repository.create.mockRejectedValueOnce(new AppError('VALIDATION_ERROR', { status: 409 }));
    await service.save(ME, body());
    expect(repository.create.mock.calls.map((c) => c[0].shareCode)).toEqual([
      'CODIGO0001',
      'CODIGO0002',
    ]);

    const stuck = setup();
    stuck.repository.create.mockRejectedValue(new AppError('VALIDATION_ERROR', { status: 409 }));
    await expect(stuck.service.save(ME, body())).rejects.toMatchObject({ status: 409 });
    expect(stuck.repository.create).toHaveBeenCalledTimes(5);
  });

  it('otros errores de la base no se reintentan', async () => {
    const { service, repository } = setup();
    repository.create.mockRejectedValueOnce(new Error('conexión caída'));
    await expect(service.save(ME, body())).rejects.toThrow('conexión caída');
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
});

describe('abrir, listar, actualizar, borrar y clonar', () => {
  it('getByShareCode devuelve piezas con nombre y total, y la evaluación actual', async () => {
    const { service } = setup();
    const { build, evaluation: ev } = await service.getByShareCode('Ab3dE9fG2h', 'otro');
    expect(build.isOwner).toBe(false);
    expect(build.totalPriceCop).toBe(1000000);
    expect(build.items[0]).toEqual({
      category: 'cpu',
      componentId: CPU,
      brand: 'Marca',
      model: 'M-cpu',
      displayName: 'Pieza cpu',
      offerId: OFFER,
      unitPriceCop: 1000000,
    });
    expect(build.items[1]).toMatchObject({ offerId: null, unitPriceCop: null });
    expect(ev.estimatedWatts).toBe(300);
    expect((await service.getByShareCode('Ab3dE9fG2h', ME)).build.isOwner).toBe(true);
  });

  it('un código que no existe da 404', async () => {
    const { service, repository } = setup();
    repository.findByShareCode.mockResolvedValueOnce(null);
    await expect(service.getByShareCode('Zzzzzzzzzz')).rejects.toMatchObject({ status: 404 });
  });

  it('list devuelve el resumen con total y cantidad de piezas', async () => {
    const { service } = setup();
    expect(await service.list(ME)).toEqual([
      {
        id: 'b1',
        name: 'Mi PC',
        shareCode: 'Ab3dE9fG2h',
        estimatedWatts: 300,
        totalPriceCop: 1000000,
        itemCount: 2,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    ]);
  });

  it('update revalida y reemplaza; uno ajeno da 404; incompatible sin draft da 422', async () => {
    const { service, repository } = setup();
    await service.update(ME, 'b1', body());
    expect(repository.replace).toHaveBeenCalledWith(
      'b1',
      ME,
      expect.objectContaining({ name: 'Mi PC', estimatedWatts: 300 }),
    );
    repository.replace.mockResolvedValueOnce(false);
    await expect(service.update(ME, 'ajeno', body())).rejects.toMatchObject({ status: 404 });
    const bad = setup({ incompatible: 2 });
    await expect(bad.service.update(ME, 'b1', body())).rejects.toMatchObject({
      code: 'BUILD_INCOMPATIBLE',
    });
    expect(bad.repository.replace).not.toHaveBeenCalled();
  });

  it('remove borra el propio y da 404 si no es del usuario', async () => {
    const { service, repository } = setup();
    await expect(service.remove(ME, 'b1')).resolves.toBeUndefined();
    repository.remove.mockResolvedValueOnce(false);
    await expect(service.remove(ME, 'ajeno')).rejects.toMatchObject({ status: 404 });
  });

  it('clone copia piezas y precios guardados a la cuenta del usuario, con " (copia)" en el nombre', async () => {
    const { service, repository } = setup({
      rows: { byCode: { userId: null, name: 'Compartido' } },
    });
    await service.clone(ME, 'Ab3dE9fG2h');
    const saved = repository.create.mock.calls[0][0];
    expect(saved.userId).toBe(ME);
    expect(saved.name).toBe('Compartido (copia)');
    expect(saved.items).toEqual([
      { category: 'cpu', componentId: CPU, offerId: OFFER, unitPriceCop: 1000000 },
      { category: 'motherboard', componentId: MB, offerId: null, unitPriceCop: null },
    ]);
  });

  it('clone recorta el nombre a 100 caracteres y da 404 si el código no existe', async () => {
    const long = setup({ rows: { byCode: { name: 'x'.repeat(100) } } });
    await long.service.clone(ME, 'Ab3dE9fG2h');
    expect(long.repository.create.mock.calls[0][0].name).toHaveLength(100);
    const missing = setup();
    missing.repository.findByShareCode.mockResolvedValueOnce(null);
    await expect(missing.service.clone(ME, 'Zzzzzzzzzz')).rejects.toMatchObject({ status: 404 });
  });
});

describe('favoritos', () => {
  it('agrega solo componentes que existen; quitar es idempotente', async () => {
    const { service, repository, catalog } = setup();
    await service.addToWishlist(ME, CPU);
    expect(repository.addToWishlist).toHaveBeenCalledWith(ME, CPU);
    catalog.exists.mockResolvedValueOnce(false);
    await expect(service.addToWishlist(ME, MB)).rejects.toMatchObject({
      code: 'COMPONENT_NOT_FOUND',
    });
    await service.removeFromWishlist(ME, CPU);
    expect(repository.removeFromWishlist).toHaveBeenCalledWith(ME, CPU);
  });

  it('listWishlist expone precio mínimo (o null) y fecha ISO', async () => {
    const { service, repository } = setup();
    repository.listWishlist.mockResolvedValueOnce([
      {
        componentId: CPU,
        category: 'cpu',
        brand: 'AMD',
        model: '7600',
        displayName: 'AMD 7600',
        minPriceCop: undefined,
        offersCount: 0,
        addedAt: NOW,
      },
    ]);
    expect(await service.listWishlist(ME)).toEqual([
      {
        componentId: CPU,
        category: 'cpu',
        brand: 'AMD',
        model: '7600',
        displayName: 'AMD 7600',
        minPriceCop: null,
        offersCount: 0,
        addedAt: NOW.toISOString(),
      },
    ]);
  });
});

describe('newShareCode', () => {
  it('son 10 letras o números y no se repiten', () => {
    const codes = new Set(Array.from({ length: 200 }, newShareCode));
    expect(codes.size).toBe(200);
    for (const code of codes) expect(code).toMatch(/^[A-Za-z0-9]{10}$/);
  });
});
