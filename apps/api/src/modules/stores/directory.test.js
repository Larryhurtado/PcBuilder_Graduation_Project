// GET /stores: directorio público de comercios verificados.
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { publicStoresQuerySchema } from '@hw/contracts';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
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
