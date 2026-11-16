import { describe, expect, it, vi } from 'vitest';
import { createSellerOffersService } from './seller-service.js';

const STORE = 's1';
const COMPONENT = '6b03b443-7b22-491c-b301-7e2a285359df';
const UUID = '0b7e7c0e-3f5e-4c43-a6a3-1c3b7f0a9d11';
const OWN_KEY = `offers/${STORE}/${UUID}.jpg`;
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('datos'),
]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('datos')]);

const row = (extra = {}) => ({
  offerId: 'o1',
  status: 'active',
  priceCop: 1500000,
  itemCondition: 'new',
  warrantyMonths: 12,
  description: null,
  publishedAt: new Date('2026-11-01T10:00:00Z'),
  updatedAt: new Date('2026-11-02T10:00:00Z'),
  componentId: COMPONENT,
  category: 'gpu',
  brand: 'NVIDIA',
  model: 'RTX 4060',
  displayName: 'NVIDIA RTX 4060',
  images: [{ key: OWN_KEY, position: 1 }],
  ...extra,
});

function setup({
  store = { id: STORE, isVerified: true },
  exists = true,
  owned = row(),
  files = [OWN_KEY],
} = {}) {
  const repository = {
    listByStore: vi.fn(async () => [row()]),
    findOwned: vi.fn(async () => owned),
    createWithImages: vi.fn(async () => 'o1'),
    updateWithImages: vi.fn(async () => true),
    setStatus: vi.fn(async () => true),
    softDelete: vi.fn(async () => true),
    countByStatus: vi.fn(async () => ({ active: 2, paused: 1 })),
  };
  const catalog = { exists: vi.fn(async () => exists) };
  const stores = { getStoreByOwner: vi.fn(async () => store) };
  const storage = { exists: vi.fn(async (k) => files.includes(k)), put: vi.fn(async () => {}) };
  return {
    repository,
    catalog,
    stores,
    storage,
    service: createSellerOffersService({ repository, catalog, stores, storage }),
  };
}

const body = {
  componentId: COMPONENT,
  priceCop: 1500000,
  condition: 'new',
  warrantyMonths: 12,
  description: null,
  imageKeys: [OWN_KEY],
};

describe('create', () => {
  it('publica la oferta del comercio y devuelve la forma del vendedor (fotos con URL)', async () => {
    const { service, repository } = setup();
    const offer = await service.create('u1', body);
    expect(repository.createWithImages).toHaveBeenCalledWith({ storeId: STORE, ...body });
    expect(offer).toMatchObject({
      offerId: 'o1',
      status: 'active',
      condition: 'new',
      publishedAt: '2026-11-01T10:00:00.000Z',
      component: { id: COMPONENT, brand: 'NVIDIA', category: 'gpu' },
      images: [{ key: OWN_KEY, url: `/storage/${OWN_KEY}`, position: 1 }],
    });
  });

  it('un comercio sin verificar recibe 403 STORE_NOT_VERIFIED y no se escribe nada', async () => {
    const { service, repository } = setup({ store: { id: STORE, isVerified: false } });
    await expect(service.create('u1', body)).rejects.toMatchObject({
      code: 'STORE_NOT_VERIFIED',
      status: 403,
    });
    expect(repository.createWithImages).not.toHaveBeenCalled();
  });

  it('un usuario sin comercio recibe 404', async () => {
    const { service } = setup({ store: null });
    await expect(service.create('u1', body)).rejects.toMatchObject({ status: 404 });
  });

  it('un producto que no está en el catálogo da COMPONENT_NOT_FOUND', async () => {
    const { service } = setup({ exists: false });
    await expect(service.create('u1', body)).rejects.toMatchObject({
      code: 'COMPONENT_NOT_FOUND',
      status: 404,
    });
  });

  it.each([
    ['foto de otro comercio', [`offers/otro/${UUID}.jpg`]],
    ['foto que no se subió', [`offers/${STORE}/11111111-1111-4111-8111-111111111111.jpg`]],
    ['nombre que no es el generado', [`offers/${STORE}/mi-foto.jpg`]],
    ['fotos repetidas', [OWN_KEY, OWN_KEY]],
  ])('rechaza con 422: %s', async (_n, imageKeys) => {
    const { service, repository } = setup();
    await expect(service.create('u1', { ...body, imageKeys })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
    });
    expect(repository.createWithImages).not.toHaveBeenCalled();
  });
});

describe('update, visibilidad y baja', () => {
  it('update cambia los campos y devuelve la oferta; una ajena da 404', async () => {
    const { service, repository } = setup();
    await service.update('u1', 'o1', { priceCop: 1400000 });
    expect(repository.updateWithImages).toHaveBeenCalledWith('o1', STORE, { priceCop: 1400000 });
    repository.updateWithImages.mockResolvedValueOnce(false);
    await expect(service.update('u1', 'otra', { priceCop: 1 })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('update revisa las fotos nuevas y exige comercio verificado', async () => {
    const { service, repository } = setup();
    await expect(
      service.update('u1', 'o1', { imageKeys: [`offers/otro/${UUID}.jpg`] }),
    ).rejects.toMatchObject({ status: 422 });
    expect(repository.updateWithImages).not.toHaveBeenCalled();
    const unverified = setup({ store: { id: STORE, isVerified: false } });
    await expect(unverified.service.update('u1', 'o1', { priceCop: 5 })).rejects.toMatchObject({
      code: 'STORE_NOT_VERIFIED',
    });
  });

  it('setVisibility pausa o activa; una oferta ajena da 404', async () => {
    const { service, repository } = setup();
    await service.setVisibility('u1', 'o1', 'paused');
    expect(repository.setStatus).toHaveBeenCalledWith('o1', STORE, 'paused');
    repository.setStatus.mockResolvedValueOnce(false);
    await expect(service.setVisibility('u1', 'x', 'active')).rejects.toMatchObject({ status: 404 });
  });

  it('remove da de baja sin exigir verificación (un comercio suspendido puede retirar lo suyo)', async () => {
    const { service, repository } = setup({ store: { id: STORE, isVerified: false } });
    await expect(service.remove('u1', 'o1')).resolves.toBeUndefined();
    expect(repository.softDelete).toHaveBeenCalledWith('o1', STORE);
    repository.softDelete.mockResolvedValueOnce(false);
    await expect(service.remove('u1', 'x')).rejects.toMatchObject({ status: 404 });
  });

  it('list devuelve el inventario del comercio, incluso sin verificar', async () => {
    const { service } = setup({ store: { id: STORE, isVerified: false } });
    expect(await service.list('u1')).toHaveLength(1);
  });

  it('countByStatus lo sirve el repositorio', async () => {
    expect(await setup().service.countByStatus(STORE)).toEqual({ active: 2, paused: 1 });
  });
});

describe('fotos', () => {
  it('presign da una URL de subida y una clave dentro de la carpeta del comercio', async () => {
    const { service } = setup();
    const result = await service.presignImage('u1', { mimeType: 'image/png' });
    expect(result.storageKey).toMatch(new RegExp(`^offers/${STORE}/[0-9a-f-]{36}\\.png$`));
    expect(result.uploadUrl).toBe(
      `/api/v1/seller/offers/images/${result.storageKey.split('/').pop()}`,
    );
  });

  it('presign exige comercio verificado', async () => {
    const { service } = setup({ store: { id: STORE, isVerified: false } });
    await expect(service.presignImage('u1', { mimeType: 'image/png' })).rejects.toMatchObject({
      code: 'STORE_NOT_VERIFIED',
    });
  });

  it('storeImage guarda un PNG o JPG verdadero en la carpeta del comercio', async () => {
    const { service, storage } = setup();
    await service.storeImage('u1', { name: `${UUID}.png`, mimeType: 'image/png', bytes: PNG });
    await service.storeImage('u1', { name: `${UUID}.jpg`, mimeType: 'image/jpeg', bytes: JPG });
    expect(storage.put).toHaveBeenNthCalledWith(1, `offers/${STORE}/${UUID}.png`, PNG);
    expect(storage.put).toHaveBeenNthCalledWith(2, `offers/${STORE}/${UUID}.jpg`, JPG);
  });

  it.each([
    [
      'un ejecutable disfrazado de PNG',
      { name: `${UUID}.png`, mimeType: 'image/png', bytes: Buffer.from('MZ\x90\x00') },
    ],
    ['un JPG con contenido de PNG', { name: `${UUID}.jpg`, mimeType: 'image/jpeg', bytes: PNG }],
    [
      'extensión que no coincide con el tipo',
      { name: `${UUID}.png`, mimeType: 'image/jpeg', bytes: JPG },
    ],
    ['nombre que no es el generado', { name: '../../x.png', mimeType: 'image/png', bytes: PNG }],
    ['tipo no permitido', { name: `${UUID}.gif`, mimeType: 'image/gif', bytes: PNG }],
    ['cuerpo vacío', { name: `${UUID}.png`, mimeType: 'image/png', bytes: Buffer.alloc(0) }],
    ['cuerpo que no es un archivo', { name: `${UUID}.png`, mimeType: 'image/png', bytes: {} }],
  ])('FILE_REJECTED (422): %s', async (_n, input) => {
    const { service, storage } = setup();
    await expect(service.storeImage('u1', input)).rejects.toMatchObject({
      code: 'FILE_REJECTED',
      status: 422,
    });
    expect(storage.put).not.toHaveBeenCalled();
  });
});
