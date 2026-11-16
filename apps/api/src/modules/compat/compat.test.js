import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  caseH510Unknown,
  coolerAk400,
  cpuRyzen5_7600,
  mbB650mPro,
} from '../../../../../packages/compat-engine/src/fixtures.js';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { createCompatModule } from './index.js';
import { createCompatService } from './service.js';

const ID = (n) => `00000000-0000-4000-8000-00000000000${n}`;

/** Catálogo falso: cada id devuelve un componente con las especificaciones indicadas. */
function fakeCatalog(components) {
  return {
    getSpecs: vi.fn(
      async (ids) => new Map(ids.filter((id) => components[id]).map((id) => [id, components[id]])),
    ),
  };
}
const component = (id, category, specs, name = `Pieza ${category}`) => ({
  id,
  category,
  brand: 'Marca',
  model: name,
  displayName: name,
  specs,
});

describe('compat service', () => {
  const catalog = fakeCatalog({
    [ID(1)]: component(ID(1), 'cpu', cpuRyzen5_7600, 'Ryzen 5 7600'),
    [ID(2)]: component(ID(2), 'motherboard', mbB650mPro, 'B650M Pro'),
    [ID(3)]: component(ID(3), 'cooler', coolerAk400, 'AK400'),
    [ID(4)]: component(ID(4), 'case', caseH510Unknown, 'H510'),
  });
  const service = createCompatService({ catalog });

  it('evalúa con las especificaciones del catálogo y devuelve las piezas', async () => {
    const result = await service.validate([
      { category: 'cpu', componentId: ID(1) },
      { category: 'motherboard', componentId: ID(2) },
    ]);
    expect(result.results.find((r) => r.code === 'RC-01').status).toBe('ok');
    expect(result.items).toEqual([
      {
        category: 'cpu',
        componentId: ID(1),
        brand: 'Marca',
        model: 'Ryzen 5 7600',
        displayName: 'Ryzen 5 7600',
      },
      {
        category: 'motherboard',
        componentId: ID(2),
        brand: 'Marca',
        model: 'B650M Pro',
        displayName: 'B650M Pro',
      },
    ]);
    expect(result.estimatedWatts).toBeGreaterThan(0);
    expect(result.summary).toEqual(expect.objectContaining({ incompatible: 0 }));
  });

  it('un dato faltante en la caja queda "no verificable", nunca compatible', async () => {
    const result = await service.validate([
      { category: 'cooler', componentId: ID(3) },
      { category: 'case', componentId: ID(4) },
    ]);
    expect(result.results.find((r) => r.code === 'RC-06').status).toBe('unknown');
  });

  it('sin piezas devuelve un armado vacío evaluable', async () => {
    const result = await service.validate([]);
    expect(result.items).toEqual([]);
    expect(result.summary.incompatible).toBe(0);
  });

  it('un componente inexistente da 404 COMPONENT_NOT_FOUND con su id', async () => {
    await expect(service.validate([{ category: 'cpu', componentId: ID(9) }])).rejects.toMatchObject(
      {
        code: 'COMPONENT_NOT_FOUND',
        status: 404,
        details: { componentId: ID(9) },
      },
    );
  });

  it('un componente en una categoría que no es la suya da 422', async () => {
    await expect(service.validate([{ category: 'gpu', componentId: ID(1) }])).rejects.toMatchObject(
      {
        code: 'VALIDATION_ERROR',
        status: 422,
      },
    );
  });

  it('constraints devuelve los filtros que imponen las piezas elegidas', async () => {
    const result = await service.constraints('motherboard', [
      { category: 'cpu', componentId: ID(1) },
    ]);
    expect(result).toEqual({ category: 'motherboard', constraints: { socket: 'AM5' } });
  });
});

describe('rutas de compatibilidad', () => {
  const catalog = fakeCatalog({
    [ID(1)]: component(ID(1), 'cpu', cpuRyzen5_7600, 'Ryzen 5 7600'),
  });

  function appWith(rateLimitOptions) {
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.use('/api/v1', createCompatModule({ catalog, rateLimitOptions }).router);
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  }

  it('POST /compat/validate y /compat/constraints son públicos', async () => {
    const app = appWith();
    const items = [{ category: 'cpu', componentId: ID(1) }];
    const validate = await request(app).post('/api/v1/compat/validate').send({ items });
    expect(validate.status).toBe(200);
    expect(validate.body.items).toHaveLength(1);
    expect(validate.body.results.length).toBeGreaterThan(0);

    const constraints = await request(app)
      .post('/api/v1/compat/constraints')
      .send({ category: 'motherboard', items });
    expect(constraints.body).toEqual({ category: 'motherboard', constraints: { socket: 'AM5' } });
  });

  it.each([
    ['sin items', {}],
    ['categoría desconocida', { items: [{ category: 'monitor', componentId: ID(1) }] }],
    ['id que no es UUID', { items: [{ category: 'cpu', componentId: 'abc' }] }],
    [
      'dos piezas de la misma categoría',
      {
        items: [
          { category: 'cpu', componentId: ID(1) },
          { category: 'cpu', componentId: ID(2) },
        ],
      },
    ],
    [
      'más de 8 piezas',
      { items: Array.from({ length: 9 }, () => ({ category: 'cpu', componentId: ID(1) })) },
    ],
    [
      'especificaciones enviadas por el cliente',
      { items: [{ category: 'cpu', componentId: ID(1), specs: { socket: 'AM9' } }] },
    ],
  ])('422: %s', async (_n, body) => {
    const res = await request(appWith()).post('/api/v1/compat/validate').send(body);
    expect(res.status).toBe(422);
  });

  it('constraints exige la categoría a elegir', async () => {
    const res = await request(appWith()).post('/api/v1/compat/constraints').send({ items: [] });
    expect(res.status).toBe(422);
  });

  it('un componente inexistente propaga el 404', async () => {
    const res = await request(appWith())
      .post('/api/v1/compat/validate')
      .send({ items: [{ category: 'cpu', componentId: ID(8) }] });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COMPONENT_NOT_FOUND');
  });

  it('el límite de tasa responde 429', async () => {
    const app = appWith({ limit: 1 });
    const send = () => request(app).post('/api/v1/compat/validate').send({ items: [] });
    expect((await send()).status).toBe(200);
    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
  });
});
