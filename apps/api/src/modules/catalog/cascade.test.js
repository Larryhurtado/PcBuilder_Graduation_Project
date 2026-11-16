// Cascada del vendedor (HU-20): marcas de una categoría y modelos de una marca.
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from '../../http/auth.js';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createCatalogRepository } from './repository.js';
import { createCatalogRouter } from './routes.js';
import { createCatalogService } from './service.js';

const TOKENS = { seller: { userId: 's1', role: 'seller' }, buyer: { userId: 'b1', role: 'buyer' } };
const auth = createAuthMiddleware((token) => {
  if (!TOKENS[token]) throw new AppError('UNAUTHENTICATED');
  return TOKENS[token];
});
const as = (role) => ({ Authorization: `Bearer ${role}` });

function appWith(service) {
  const app = express();
  app.use(requestId);
  app.use('/api/v1', createCatalogRouter({ service, auth }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('GET /catalog/brands y /catalog/models', () => {
  it('el vendedor recibe las marcas de la categoría', async () => {
    const service = { listBrands: vi.fn(async () => [{ id: 1, name: 'AMD' }]) };
    const res = await request(appWith(service))
      .get('/api/v1/catalog/brands?category=cpu')
      .set(as('seller'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [{ id: 1, name: 'AMD' }] });
    expect(service.listBrands).toHaveBeenCalledWith('cpu');
  });

  it('y los modelos de una marca (brandId llega como número)', async () => {
    const service = { listModels: vi.fn(async () => []) };
    const res = await request(appWith(service))
      .get('/api/v1/catalog/models?category=gpu&brandId=3')
      .set(as('seller'));
    expect(res.status).toBe(200);
    expect(service.listModels).toHaveBeenCalledWith('gpu', 3);
  });

  it('sin sesión 401 y un comprador 403: es una herramienta del vendedor', async () => {
    const service = { listBrands: vi.fn() };
    const app = appWith(service);
    expect((await request(app).get('/api/v1/catalog/brands?category=cpu')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/catalog/brands?category=cpu').set(as('buyer'))).status,
    ).toBe(403);
    expect(service.listBrands).not.toHaveBeenCalled();
  });

  it.each([
    ['/api/v1/catalog/brands', 'sin categoría'],
    ['/api/v1/catalog/brands?category=monitor', 'categoría desconocida'],
    ['/api/v1/catalog/models?category=cpu', 'sin marca'],
    ['/api/v1/catalog/models?category=cpu&brandId=abc', 'marca que no es número'],
    ['/api/v1/catalog/models?category=cpu&brandId=0', 'marca inválida'],
  ])('422: %s (%s)', async (url) => {
    const res = await request(appWith({})).get(url).set(as('seller'));
    expect(res.status).toBe(422);
  });
});

describe('cascada: servicio y repositorio', () => {
  it('el servicio devuelve solo los campos públicos', async () => {
    const repository = {
      listBrands: vi.fn(async () => [{ id: 2, name: 'Intel', extra: 'x' }]),
      listModels: vi.fn(async () => [
        { componentId: 'c1', model: 'i5-12400F', displayName: 'Intel Core i5-12400F', extra: 1 },
      ]),
    };
    const service = createCatalogService({ repository });
    expect(await service.listBrands('cpu')).toEqual([{ id: 2, name: 'Intel' }]);
    expect(await service.listModels('cpu', 2)).toEqual([
      { componentId: 'c1', model: 'i5-12400F', displayName: 'Intel Core i5-12400F' },
    ]);
  });

  it('el repositorio solo considera componentes activos y usa parámetros', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    const repo = createCatalogRepository(db);
    await repo.listBrands('cpu');
    await repo.listModels('cpu', 5);
    const [brands, models] = db.query.mock.calls;
    expect(brands[0]).toContain("c.status = 'active'");
    expect(brands[1]).toEqual(['cpu']);
    expect(models[0]).toContain("c.status = 'active'");
    expect(models[1]).toEqual(['cpu', 5]);
  });
});
