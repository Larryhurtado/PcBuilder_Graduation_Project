// Resumen del panel del vendedor (HU-17).
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from '../../http/auth.js';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createAnalyticsRepository } from './repository.js';
import { createAnalyticsRouter } from './routes.js';
import { MAX_RANGE_DAYS, createAnalyticsService } from './service.js';

function setup({ store = { id: 's1' }, rows = [] } = {}) {
  const repository = { dailyCounts: vi.fn(async () => rows) };
  const offers = { countByStatus: vi.fn(async () => ({ active: 4, paused: 2 })) };
  const stores = { getStoreByOwner: vi.fn(async () => store) };
  return {
    repository,
    offers,
    stores,
    service: createAnalyticsService({ repository, offers, stores }),
  };
}

// 16 de noviembre de 2026, 10:00 en Colombia
const NOW = new Date('2026-11-16T15:00:00Z');

describe('getSellerSummary', () => {
  it('por defecto cubre los últimos 7 días terminando hoy (hora de Colombia)', async () => {
    const { service, repository } = setup();
    const summary = await service.getSellerSummary('u1', {}, NOW);
    expect(summary.daily.map((d) => d.day)).toEqual([
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
    ]);
    expect(repository.dailyCounts).toHaveBeenCalledWith('s1', '2026-11-10', '2026-11-16');
  });

  it('"hoy" es el día de Colombia aunque en UTC ya sea el siguiente', async () => {
    const { service, repository } = setup();
    await service.getSellerSummary('u1', {}, new Date('2026-11-17T03:00:00Z')); // 22:00 del 16 en Bogotá
    expect(repository.dailyCounts).toHaveBeenCalledWith('s1', '2026-11-10', '2026-11-16');
  });

  it('rellena con ceros los días sin eventos y suma los totales', async () => {
    const { service } = setup({
      rows: [
        { day: '2026-11-12', views: 10, whatsappClicks: 2 },
        { day: '2026-11-16', views: 5, whatsappClicks: 1 },
      ],
    });
    const summary = await service.getSellerSummary(
      'u1',
      { from: '2026-11-12', to: '2026-11-16' },
      NOW,
    );
    expect(summary.daily).toEqual([
      { day: '2026-11-12', views: 10, whatsappClicks: 2 },
      { day: '2026-11-13', views: 0, whatsappClicks: 0 },
      { day: '2026-11-14', views: 0, whatsappClicks: 0 },
      { day: '2026-11-15', views: 0, whatsappClicks: 0 },
      { day: '2026-11-16', views: 5, whatsappClicks: 1 },
    ]);
    expect(summary.totals).toEqual({
      views: 15,
      whatsappClicks: 3,
      activeOffers: 4,
      pausedOffers: 2,
    });
  });

  it('un rango de un solo día es válido; cruzar un fin de mes y de año funciona', async () => {
    const { service } = setup();
    expect(
      (await service.getSellerSummary('u1', { from: '2026-11-16', to: '2026-11-16' }, NOW)).daily,
    ).toHaveLength(1);
    const across = await service.getSellerSummary(
      'u1',
      { from: '2026-12-30', to: '2027-01-02' },
      NOW,
    );
    expect(across.daily.map((d) => d.day)).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });

  it(`rechaza rangos de más de ${MAX_RANGE_DAYS} días o invertidos`, async () => {
    const { service, repository } = setup();
    await expect(
      service.getSellerSummary('u1', { from: '2026-01-01', to: '2026-11-16' }, NOW),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    await expect(
      service.getSellerSummary('u1', { from: '2026-11-16', to: '2026-11-10' }, NOW),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(repository.dailyCounts).not.toHaveBeenCalled();
    // el límite exacto sí se acepta
    await expect(
      service.getSellerSummary('u1', { from: '2026-08-19', to: '2026-11-16' }, NOW),
    ).resolves.toBeDefined();
  });

  it('un usuario sin comercio recibe 404', async () => {
    const { service } = setup({ store: null });
    await expect(service.getSellerSummary('u1', {}, NOW)).rejects.toMatchObject({ status: 404 });
  });
});

describe('repository.dailyCounts', () => {
  it('agrupa por día de Colombia y filtra por comercio con parámetros', async () => {
    const db = { query: vi.fn(async () => ({ rows: [{ day: '2026-11-16' }] })) };
    const rows = await createAnalyticsRepository(db).dailyCounts('s1', '2026-11-10', '2026-11-16');
    expect(rows).toEqual([{ day: '2026-11-16' }]);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain("AT TIME ZONE 'America/Bogota'");
    expect(sql).toContain('store_id = $1');
    expect(params).toEqual(['s1', '2026-11-10', '2026-11-16']);
  });
});

describe('GET /seller/analytics/summary', () => {
  const TOKENS = {
    seller: { userId: 'u1', role: 'seller' },
    buyer: { userId: 'b1', role: 'buyer' },
  };
  const auth = createAuthMiddleware((t) => {
    if (!TOKENS[t]) throw new AppError('UNAUTHENTICATED');
    return TOKENS[t];
  });
  const as = (role) => ({ Authorization: `Bearer ${role}` });
  const appWith = (service) => {
    const app = express();
    app.use(requestId);
    app.use('/api/v1', createAnalyticsRouter({ service, auth }));
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  };

  it('devuelve el resumen y pasa el rango validado', async () => {
    const service = { getSellerSummary: vi.fn(async () => ({ totals: {}, daily: [] })) };
    const res = await request(appWith(service))
      .get('/api/v1/seller/analytics/summary?from=2026-11-10&to=2026-11-16')
      .set(as('seller'));
    expect(res.status).toBe(200);
    expect(service.getSellerSummary).toHaveBeenCalledWith('u1', {
      from: '2026-11-10',
      to: '2026-11-16',
    });
  });

  it('sin parámetros usa los valores por defecto del servicio', async () => {
    const service = { getSellerSummary: vi.fn(async () => ({})) };
    await request(appWith(service)).get('/api/v1/seller/analytics/summary').set(as('seller'));
    expect(service.getSellerSummary).toHaveBeenCalledWith('u1', {});
  });

  it.each([
    ['fecha mal escrita', '?from=16-11-2026'],
    ['fecha inexistente en el formato', '?to=hoy'],
    ['rango invertido', '?from=2026-11-16&to=2026-11-10'],
  ])('422: %s', async (_n, qs) => {
    const service = { getSellerSummary: vi.fn() };
    const res = await request(appWith(service))
      .get(`/api/v1/seller/analytics/summary${qs}`)
      .set(as('seller'));
    expect(res.status).toBe(422);
    expect(service.getSellerSummary).not.toHaveBeenCalled();
  });

  it('sin sesión 401, comprador 403', async () => {
    const service = { getSellerSummary: vi.fn() };
    const app = appWith(service);
    expect((await request(app).get('/api/v1/seller/analytics/summary')).status).toBe(401);
    expect(
      (await request(app).get('/api/v1/seller/analytics/summary').set(as('buyer'))).status,
    ).toBe(403);
  });
});
