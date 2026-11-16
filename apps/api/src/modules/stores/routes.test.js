import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from '../../http/auth.js';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createStoresRouter } from './routes.js';

const TOKENS = {
  buyer: { userId: 'b1', role: 'buyer' },
  seller: { userId: 's1', role: 'seller' },
};

function setup() {
  const service = {
    convert: vi.fn(async () => ({
      accessToken: 'jwt',
      expiresIn: 900,
      user: {},
      store: { id: 'st1' },
    })),
    getStore: vi.fn(async () => ({ id: 'st1' })),
    updateStore: vi.fn(async (_u, patch) => ({ id: 'st1', ...patch })),
    getVerificationStatus: vi.fn(async () => ({ status: 'not_submitted' })),
  };
  const auth = createAuthMiddleware((t) => {
    if (!TOKENS[t]) throw new AppError('UNAUTHENTICATED');
    return TOKENS[t];
  });
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use('/api/v1', createStoresRouter({ service, auth }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, service };
}
const as = (role) => ({ Authorization: `Bearer ${role}` });

describe('POST /seller/convert', () => {
  it('un comprador recibe 201 con la tienda y el token nuevo', async () => {
    const { app, service } = setup();
    const res = await request(app)
      .post('/api/v1/seller/convert')
      .set(as('buyer'))
      .send({ legalName: ' Tecno SAS ', tradeName: 'Tecno' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBe('jwt');
    expect(service.convert).toHaveBeenCalledWith('b1', {
      legalName: 'Tecno SAS',
      tradeName: 'Tecno',
    });
  });

  it('sin sesión 401; un vendedor ya convertido 403', async () => {
    const { app } = setup();
    const body = { legalName: 'Tecno SAS', tradeName: 'Tecno' };
    expect((await request(app).post('/api/v1/seller/convert').send(body)).status).toBe(401);
    expect(
      (await request(app).post('/api/v1/seller/convert').set(as('seller')).send(body)).status,
    ).toBe(403);
  });

  it.each([
    ['nombre comercial muy corto', { legalName: 'Tecno SAS', tradeName: 'T' }],
    ['sin razón social', { tradeName: 'Tecno' }],
    ['campo extra', { legalName: 'Tecno SAS', tradeName: 'Tecno', role: 'admin' }],
  ])('422: %s', async (_n, body) => {
    const { app, service } = setup();
    const res = await request(app).post('/api/v1/seller/convert').set(as('buyer')).send(body);
    expect(res.status).toBe(422);
    expect(service.convert).not.toHaveBeenCalled();
  });
});

describe('rutas del vendedor sobre su negocio', () => {
  it('GET /seller/store y /seller/verification/status piden rol vendedor', async () => {
    const { app } = setup();
    expect((await request(app).get('/api/v1/seller/store').set(as('seller'))).body).toEqual({
      store: { id: 'st1' },
    });
    expect(
      (await request(app).get('/api/v1/seller/verification/status').set(as('seller'))).body,
    ).toEqual({
      status: 'not_submitted',
    });
    expect((await request(app).get('/api/v1/seller/store').set(as('buyer'))).status).toBe(403);
    expect((await request(app).get('/api/v1/seller/verification/status')).status).toBe(401);
  });

  it('PATCH /seller/store valida y pasa solo lo enviado', async () => {
    const { app, service } = setup();
    const res = await request(app)
      .patch('/api/v1/seller/store')
      .set(as('seller'))
      .send({ whatsappE164: '+573001112233', city: 'Cali' });
    expect(res.status).toBe(200);
    expect(service.updateStore).toHaveBeenCalledWith('s1', {
      whatsappE164: '+573001112233',
      city: 'Cali',
    });
  });

  it.each([
    ['WhatsApp no colombiano', { whatsappE164: '+14155550123' }],
    ['WhatsApp sin el +57', { whatsappE164: '3001112233' }],
    ['NIT sin dígito de verificación', { nit: '900123456' }],
    ['cuerpo vacío', {}],
    ['campo que no se puede editar', { isVerified: true }],
    ['descripción de más de 1000 caracteres', { description: 'x'.repeat(1001) }],
    ['latitud fuera de rango', { latitude: 120 }],
    ['ciudad en null (la verificación la exige)', { city: null }],
  ])('422: %s', async (_n, body) => {
    const { app, service } = setup();
    const res = await request(app).patch('/api/v1/seller/store').set(as('seller')).send(body);
    expect(res.status).toBe(422);
    expect(service.updateStore).not.toHaveBeenCalled();
  });
});
