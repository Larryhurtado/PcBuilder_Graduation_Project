import { describe, expect, it, vi } from 'vitest';
import { componentSchema } from '@hw/contracts';
import { createCatalogService } from './service.js';

const ID_CPU = '6b03b443-7b22-491c-b301-7e2a285359df';
const ID_GPU = '11111111-1111-4111-8111-111111111111';

const header = (id, category, overrides = {}) => ({
  id,
  category,
  brand: 'AMD',
  model: 'x',
  displayName: 'AMD x',
  releaseYear: 2023,
  version: 1,
  updatedAt: new Date('2026-11-16T12:00:00Z'),
  sourceName: 'BuildCores OpenDB',
  sourceLicense: 'CC BY-NC-SA 4.0',
  sourceAttribution: 'Data from…',
  ...overrides,
});

const cpuSpecs = {
  componentId: ID_CPU,
  socket: 'AM5',
  tdpW: 65,
  cores: 6,
  threads: 12,
  baseClockGhz: 3.8,
  boostClockGhz: 5.1,
  memoryTypes: ['DDR5'],
  hasIntegratedGraphics: true,
};
const gpuSpecs = {
  componentId: ID_GPU,
  tdpW: 160,
  lengthMm: null,
  slotWidth: null,
  interface: null,
  memoryGb: null,
  powerConnectors: null,
};

function fakeRepository() {
  const headers = [header(ID_CPU, 'cpu'), header(ID_GPU, 'gpu')];
  return {
    findComponents: vi.fn(async (ids) => headers.filter((h) => ids.includes(h.id))),
    findSpecs: vi.fn(async (category) => (category === 'cpu' ? [cpuSpecs] : [gpuSpecs])),
    search: vi.fn(async () => [
      {
        id: ID_CPU,
        category: 'cpu',
        brand: 'AMD',
        model: 'x',
        displayName: 'AMD x',
        minPriceCop: 849000,
        offersCount: 2,
      },
      {
        id: ID_GPU,
        category: 'gpu',
        brand: 'MSI',
        model: 'y',
        displayName: 'MSI y',
        minPriceCop: undefined,
        offersCount: 0,
      },
    ]),
  };
}

describe('catalog service', () => {
  it('getComponent devuelve la cabecera con specs planas, sin componentId', async () => {
    const service = createCatalogService({ repository: fakeRepository() });
    const component = await service.getComponent(ID_CPU);
    expect(component.specs.socket).toBe('AM5');
    expect(component.specs).not.toHaveProperty('componentId');
    expect(component.updatedAt).toBe('2026-11-16T12:00:00.000Z');
    expect(component.source).toEqual({
      name: 'BuildCores OpenDB',
      license: 'CC BY-NC-SA 4.0',
      attributionText: 'Data from…',
    });
    expect(componentSchema.safeParse(component).success).toBe(true);
  });

  it('un dato desconocido llega como null y sigue siendo válido', async () => {
    const service = createCatalogService({ repository: fakeRepository() });
    const gpu = await service.getComponent(ID_GPU);
    expect(gpu.specs.lengthMm).toBeNull();
    expect(componentSchema.safeParse(gpu).success).toBe(true);
  });

  it('un componente inexistente lanza COMPONENT_NOT_FOUND (404)', async () => {
    const service = createCatalogService({ repository: fakeRepository() });
    const error = await service
      .getComponent('99999999-9999-4999-8999-999999999999')
      .catch((e) => e);
    expect(error.code).toBe('COMPONENT_NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it('getSpecs hace una consulta de especificaciones por categoría y devuelve un Map', async () => {
    const repository = fakeRepository();
    const service = createCatalogService({ repository });
    const map = await service.getSpecs([ID_CPU, ID_GPU, ID_CPU]);
    expect([...map.keys()].sort()).toEqual([ID_CPU, ID_GPU].sort());
    expect(repository.findComponents).toHaveBeenCalledTimes(1);
    expect(repository.findSpecs).toHaveBeenCalledTimes(2);
  });

  it('getSpecs con una lista vacía no consulta la base', async () => {
    const repository = fakeRepository();
    const map = await createCatalogService({ repository }).getSpecs([]);
    expect(map.size).toBe(0);
    expect(repository.findComponents).not.toHaveBeenCalled();
  });

  it('si falta la fila de especificaciones es un error interno', async () => {
    const repository = fakeRepository();
    repository.findSpecs = vi.fn(async () => []);
    await expect(createCatalogService({ repository }).getComponent(ID_CPU)).rejects.toThrow(
      /no tiene fila de especificaciones/,
    );
  });

  it('exists indica si el componente está activo', async () => {
    const service = createCatalogService({ repository: fakeRepository() });
    expect(await service.exists(ID_CPU)).toBe(true);
    expect(await service.exists('99999999-9999-4999-8999-999999999999')).toBe(false);
  });

  it('search normaliza el precio ausente a null y recorta el texto', async () => {
    const repository = fakeRepository();
    const items = await createCatalogService({ repository }).search('  ryzen ', 5);
    expect(repository.search).toHaveBeenCalledWith('ryzen', 5);
    expect(items[0].minPriceCop).toBe(849000);
    expect(items[1].minPriceCop).toBeNull();
  });
});
