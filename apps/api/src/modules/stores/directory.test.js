// GET /stores: directorio público de comercios verificados.
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { publicStoresQuerySchema } from '@hw/contracts';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createStoresRepository } from './repository.js';
import { createStoresRouter } from './routes.js';
import { createStoresService } from './service.js';

const ROW = {
  id: 's1',
  tradeName: 'TecnoPasarela Cali',
  description: 'Componentes',
  logoKey: null,
  department: 'Valle del Cauca',
  city: 'Cali',
  commercialCenter: 'C.C. Pasarela',
  address: 'Calle 5 # 10-20',
  whatsappE164: '+573001234567',
  offersCount: 4,
  // campos que nunca deben salir
  legalName: 'Tecno SAS',
  nit: '900123456-7',
  ownerUserId: 'u1',
};

describe('service.listPublic', () => {
  it('devuelve solo datos comerciales: nunca razón social, NIT ni dueño', async () => {
    const repository = { listVerified: vi.fn(async () => [ROW]) };
    const service = createStoresService({ repository, identity: {}, verification: {} });
    const [store] = await service.listPublic({ limit: 12 });
    expect(store).toEqual({
      id: 's1',
      name: 'TecnoPasarela Cali',
      description: 'Componentes',
      logoUrl: null,
      department: 'Valle del Cauca',
      city: 'Cali',
      commercialCenter: 'C.C. Pasarela',
      address: 'Calle 5 # 10-20',
      whatsappE164: '+573001234567',
      offersCount: 4,
    });
    expect(JSON.stringify(store)).not.toMatch(/900123456|Tecno SAS|u1/);
  });

  it('el logo se convierte en URL y los datos faltantes en null', async () => {
    const repository = {
      listVerified: vi.fn(async () => [
        { id: 's2', tradeName: 'X Store', logoKey: 'logos/x.png', offersCount: 0 },
      ]),
    };
    const service = createStoresService({ repository, identity: {}, verification: {} });
    expect((await service.listPublic({ limit: 5 }))[0]).toMatchObject({
      logoUrl: '/storage/logos/x.png',
      city: null,
      whatsappE164: null,
      description: null,
    });
  });
});

describe('repository.listVerified', () => {
  it('filtra solo verificados, parametriza texto y ciudad y escapa los comodines de LIKE', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    await createStoresRepository(db).listVerified({ q: '100%_off', city: 'Cali', limit: 5 });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain(
      'WHERE s.is_verified AND s.trade_name ILIKE $1 AND lower(s.city) = lower($2)',
    );
    expect(sql).toContain('LIMIT $3');
    expect(sql).toContain('readmodel.public_offers');
    expect(params).toEqual(['%100\\%\\_off%', 'Cali', 5]);
  });

  it('sin filtros solo aplica verificado y límite', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    await createStoresRepository(db).listVerified({ limit: 12 });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('WHERE s.is_verified\n');
    expect(params).toEqual([12]);
  });
});

describe('GET /stores', () => {
  const auth = {
    requireAuth: (_q, _s, next) => next(),
    requireRole: () => (_q, _s, next) => next(),
  };
  function appWith(service) {
    const app = express();
    app.use(requestId);
    app.use('/api/v1', createStoresRouter({ service, auth }));
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  }

  it('es público y usa 12 como límite por defecto', async () => {
    const service = { listPublic: vi.fn(async () => [{ id: 's1' }]) };
    const res = await request(appWith(service)).get('/api/v1/stores');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [{ id: 's1' }] });
    expect(service.listPublic).toHaveBeenCalledWith({ limit: 12 });
  });

  it('acepta texto, ciudad y límite', async () => {
    const service = { listPublic: vi.fn(async () => []) };
    await request(appWith(service)).get('/api/v1/stores?q=tecno&city=Cali&limit=3');
    expect(service.listPublic).toHaveBeenCalledWith({ q: 'tecno', city: 'Cali', limit: 3 });
  });

  it.each(['?limit=0', '?limit=51', '?limit=abc', '?q=a', '?city=x'])('422: %s', async (qs) => {
    const service = { listPublic: vi.fn() };
    expect((await request(appWith(service)).get(`/api/v1/stores${qs}`)).status).toBe(422);
    expect(service.listPublic).not.toHaveBeenCalled();
  });
});

describe('publicStoresQuerySchema', () => {
  it('recorta espacios y completa el límite', () => {
    expect(publicStoresQuerySchema.parse({ q: '  tecno ' })).toEqual({ q: 'tecno', limit: 12 });
  });
});

describe('GET /stores/:id', () => {
  const ID = '6b03b443-7b22-491c-b301-7e2a285359df';
  const auth = {
    requireAuth: (_q, _s, next) => next(),
    requireRole: () => (_q, _s, next) => next(),
  };
  function appWith(service, rateLimitOptions) {
    const app = express();
    app.use(requestId);
    app.use('/api/v1', createStoresRouter({ service, auth, rateLimitOptions }));
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  }

  it('service.getPublic devuelve la misma forma que el listado, sin datos legales', async () => {
    const repository = {
      findVerifiedById: vi.fn(async () => ROW),
      listVerified: vi.fn(async () => [ROW]),
    };
    const service = createStoresService({ repository, identity: {}, verification: {} });
    const detail = await service.getPublic('s1');
    expect(detail).toEqual((await service.listPublic({ limit: 12 }))[0]);
    expect(JSON.stringify(detail)).not.toMatch(/900123456|Tecno SAS|u1/);
  });

  it('service.getPublic lanza STORE_NOT_FOUND (404) si el repositorio no lo devuelve', async () => {
    const repository = { findVerifiedById: vi.fn(async () => null) };
    const service = createStoresService({ repository, identity: {}, verification: {} });
    await expect(service.getPublic('s9')).rejects.toMatchObject({
      code: 'STORE_NOT_FOUND',
      status: 404,
    });
  });

  it('repository.findVerifiedById solo busca verificados, por parámetro', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    expect(await createStoresRepository(db).findVerifiedById(ID)).toBeNull();
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('WHERE s.is_verified AND s.id = $1');
    expect(sql).toContain('readmodel.public_offers'); // mismo conteo que el listado
    expect(params).toEqual([ID]);
  });

  it('la ruta es pública y devuelve el comercio', async () => {
    const service = { getPublic: vi.fn(async () => ({ id: ID })) };
    const res = await request(appWith(service)).get(`/api/v1/stores/${ID}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: ID });
    expect(service.getPublic).toHaveBeenCalledWith(ID);
  });

  it.each(['abc', '123', 'no-es-un-guid'])(
    'un id mal formado (%s) da 422 sin llegar al servicio',
    async (id) => {
      const service = { getPublic: vi.fn() };
      const res = await request(appWith(service)).get(`/api/v1/stores/${id}`);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(service.getPublic).not.toHaveBeenCalled();
    },
  );

  it('STORE_NOT_FOUND llega como 404 con el formato estándar', async () => {
    const service = {
      getPublic: vi.fn(async () => {
        throw new AppError('STORE_NOT_FOUND');
      }),
    };
    const res = await request(appWith(service)).get(`/api/v1/stores/${ID}`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 'STORE_NOT_FOUND',
      message: 'No encontramos ese comercio.',
    });
    expect(res.body.requestId).toEqual(expect.any(String));
  });

  it('el listado y el detalle comparten el límite de 120 por minuto: se excede con 429', async () => {
    const service = { listPublic: vi.fn(async () => []), getPublic: vi.fn(async () => ({})) };
    const app = appWith(service, { limit: 2 });
    expect((await request(app).get('/api/v1/stores')).status).toBe(200);
    expect((await request(app).get(`/api/v1/stores/${ID}`)).status).toBe(200);
    const limited = await request(app).get(`/api/v1/stores/${ID}`);
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
  });
});
