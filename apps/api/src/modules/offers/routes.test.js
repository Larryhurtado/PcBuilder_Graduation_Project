import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createOffersRouter } from './routes.js';

const ID = '6b03b443-7b22-491c-b301-7e2a285359df';

function appWith(service) {
  const app = express();
  app.use(requestId);
  app.use('/api/v1', createOffersRouter({ service }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const service = () => ({
  search: vi.fn(async () => ({ items: [], nextCursor: null })),
  featured: vi.fn(async () => ({ items: [] })),
  getOffer: vi.fn(async (id) => ({ offerId: id })),
});

describe('GET /offers', () => {
  it('usa los valores por defecto: orden por fecha, 20 por página, sin especificaciones', async () => {
    const s = service();
    const res = await request(appWith(s)).get('/api/v1/offers');
    expect(res.status).toBe(200);
    expect(s.search).toHaveBeenCalledWith({ sort: 'newest', limit: 20, includeSpecs: false });
  });

  it('convierte los parámetros: números, includeSpecs y listas', async () => {
    const s = service();
    await request(appWith(s)).get(
      '/api/v1/offers?category=motherboard&minPrice=100000&maxPrice=900000&sort=price_asc&limit=5&includeSpecs=true&socket=AM5&form_factor=ATX,Micro%20ATX&condition=new',
    );
    expect(s.search).toHaveBeenCalledWith({
      category: 'motherboard',
      minPrice: 100000,
      maxPrice: 900000,
      sort: 'price_asc',
      limit: 5,
      includeSpecs: true,
      socket: ['AM5'],
      form_factor: ['ATX', 'Micro ATX'],
      condition: 'new',
    });
  });

  it('acepta un parámetro repetido como lista', async () => {
    const s = service();
    await request(appWith(s)).get('/api/v1/offers?category=ram&ram_type=DDR4&ram_type=DDR5');
    expect(s.search.mock.calls[0][0].ram_type).toEqual(['DDR4', 'DDR5']);
  });

  it.each([
    ['categoría desconocida', 'category=monitor'],
    ['orden desconocido', 'sort=barato'],
    ['límite fuera de rango', 'limit=500'],
    ['precio negativo', 'minPrice=-1'],
    ['rango de precio invertido', 'minPrice=900&maxPrice=100'],
    ['filtro técnico sin categoría', 'socket=AM5'],
    ['condición inválida', 'condition=roto'],
    ['storeId que no es UUID', 'storeId=abc'],
  ])('rechaza con 422: %s', async (_name, qs) => {
    const s = service();
    const res = await request(appWith(s)).get(`/api/v1/offers?${qs}`);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(s.search).not.toHaveBeenCalled();
  });
});

describe('GET /offers/featured y /offers/:id', () => {
  it('"featured" no se confunde con un id', async () => {
    const s = service();
    const res = await request(appWith(s)).get('/api/v1/offers/featured?limit=3');
    expect(res.status).toBe(200);
    expect(s.featured).toHaveBeenCalledWith(3);
    expect(s.getOffer).not.toHaveBeenCalled();
  });

  it('el límite de destacadas tiene máximo 20', async () => {
    const res = await request(appWith(service())).get('/api/v1/offers/featured?limit=50');
    expect(res.status).toBe(422);
  });

  it('GET /offers/:id devuelve el detalle', async () => {
    const s = service();
    const res = await request(appWith(s)).get(`/api/v1/offers/${ID}`);
    expect(res.body).toEqual({ offerId: ID });
  });

  it('un id mal formado responde 422 y uno no público responde 404', async () => {
    expect((await request(appWith(service())).get('/api/v1/offers/abc')).status).toBe(422);
    const s = service();
    s.getOffer = async () => {
      throw new AppError('NOT_FOUND', { message: 'La oferta no está disponible.' });
    };
    const res = await request(appWith(s)).get(`/api/v1/offers/${ID}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('La oferta no está disponible.');
  });
});
