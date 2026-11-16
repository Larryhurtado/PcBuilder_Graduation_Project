import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createCatalogRouter } from './routes.js';

const ID = '6b03b443-7b22-491c-b301-7e2a285359df';

function appWith(service) {
  const app = express();
  app.use(requestId);
  app.use('/api/v1', createCatalogRouter({ service }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('rutas del catálogo', () => {
  it('GET /components/:id devuelve el componente', async () => {
    const service = { getComponent: vi.fn(async (id) => ({ id })) };
    const res = await request(appWith(service)).get(`/api/v1/components/${ID}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: ID });
    expect(service.getComponent).toHaveBeenCalledWith(ID);
  });

  it('un id que no es UUID responde 422 sin llegar al servicio', async () => {
    const service = { getComponent: vi.fn() };
    const res = await request(appWith(service)).get('/api/v1/components/no-es-uuid');
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(service.getComponent).not.toHaveBeenCalled();
  });

  it('un componente inexistente responde 404 COMPONENT_NOT_FOUND', async () => {
    const service = {
      getComponent: async () => {
        throw new AppError('COMPONENT_NOT_FOUND');
      },
    };
    const res = await request(appWith(service)).get(`/api/v1/components/${ID}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COMPONENT_NOT_FOUND');
  });

  it('GET /catalog/search usa el texto y el límite por defecto', async () => {
    const service = { search: vi.fn(async () => []) };
    const res = await request(appWith(service)).get('/api/v1/catalog/search?q=ryzen');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [] });
    expect(service.search).toHaveBeenCalledWith('ryzen', 8);
  });

  it('el buscador rechaza textos de menos de 2 caracteres y límites fuera de rango', async () => {
    const service = { search: vi.fn() };
    const app = appWith(service);
    expect((await request(app).get('/api/v1/catalog/search?q=r')).status).toBe(422);
    expect((await request(app).get('/api/v1/catalog/search')).status).toBe(422);
    expect((await request(app).get('/api/v1/catalog/search?q=ryzen&limit=99')).status).toBe(422);
    expect(service.search).not.toHaveBeenCalled();
  });
});
