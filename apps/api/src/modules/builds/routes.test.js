import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from '../../http/auth.js';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createBuildsRouter } from './routes.js';

const CPU = '00000000-0000-4000-8000-000000000001';
const ID = '6b03b443-7b22-491c-b301-7e2a285359df';
const CODE = 'Ab3dE9fG2h';
const as = { Authorization: 'Bearer ok' };

function setup(rateLimitOptions) {
  const result = { build: { id: ID }, evaluation: {} };
  const service = {
    save: vi.fn(async () => result),
    getByShareCode: vi.fn(async () => result),
    clone: vi.fn(async () => result),
    list: vi.fn(async () => []),
    update: vi.fn(async () => result),
    remove: vi.fn(async () => {}),
    listWishlist: vi.fn(async () => []),
    addToWishlist: vi.fn(async () => {}),
    removeFromWishlist: vi.fn(async () => {}),
  };
  const auth = createAuthMiddleware((t) => {
    if (t === 'vencido') throw new AppError('TOKEN_EXPIRED');
    if (t !== 'ok') throw new AppError('UNAUTHENTICATED');
    return { userId: 'u1', role: 'buyer' };
  });
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use('/api/v1', createBuildsRouter({ service, auth, rateLimitOptions }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, service };
}

const valid = { items: [{ category: 'cpu', componentId: CPU }] };

describe('POST /builds', () => {
  it('con sesión guarda en la cuenta (201) y aplica los valores por defecto', async () => {
    const { app, service } = setup();
    const res = await request(app).post('/api/v1/builds').set(as).send(valid);
    expect(res.status).toBe(201);
    expect(service.save).toHaveBeenCalledWith('u1', {
      name: 'Mi configuración',
      draft: false,
      items: [{ category: 'cpu', componentId: CPU }],
    });
  });

  it('sin sesión guarda como anónimo', async () => {
    const { app, service } = setup();
    expect((await request(app).post('/api/v1/builds').send(valid)).status).toBe(201);
    expect(service.save.mock.calls[0][0]).toBeNull();
  });

  it('un token vencido responde 401 TOKEN_EXPIRED (no se degrada a anónimo)', async () => {
    const { app, service } = setup();
    const res = await request(app)
      .post('/api/v1/builds')
      .set({ Authorization: 'Bearer vencido' })
      .send(valid);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
    expect(service.save).not.toHaveBeenCalled();
  });

  it.each([
    ['sin piezas', { items: [] }],
    [
      'más de 8 piezas',
      { items: Array.from({ length: 9 }, () => ({ category: 'cpu', componentId: CPU })) },
    ],
    ['categoría repetida', { items: [valid.items[0], valid.items[0]] }],
    ['nombre vacío', { ...valid, name: '  ' }],
    ['nombre de más de 100 caracteres', { ...valid, name: 'x'.repeat(101) }],
    ['oferta que no es UUID', { items: [{ ...valid.items[0], offerId: 'abc' }] }],
    ['campo de más (userId)', { ...valid, userId: 'otro' }],
    ['precio enviado por el cliente', { items: [{ ...valid.items[0], unitPriceCop: 1 }] }],
  ])('422: %s', async (_n, body) => {
    const { app, service } = setup();
    const res = await request(app).post('/api/v1/builds').set(as).send(body);
    expect(res.status).toBe(422);
    expect(service.save).not.toHaveBeenCalled();
  });

  it('BUILD_INCOMPATIBLE llega con su código y detalle', async () => {
    const { app, service } = setup();
    service.save.mockRejectedValueOnce(
      new AppError('BUILD_INCOMPATIBLE', { details: { incompatible: [] } }),
    );
    const res = await request(app).post('/api/v1/builds').set(as).send(valid);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BUILD_INCOMPATIBLE');
  });

  it('el límite de guardados por IP responde 429', async () => {
    const { app } = setup({ limit: 1 });
    expect((await request(app).post('/api/v1/builds').send(valid)).status).toBe(201);
    const limited = await request(app).post('/api/v1/builds').send(valid);
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
  });
});

describe('enlace compartible', () => {
  it('GET /builds/:shareCode es público y pasa el lector si hay sesión', async () => {
    const { app, service } = setup();
    expect((await request(app).get(`/api/v1/builds/${CODE}`)).status).toBe(200);
    expect(service.getByShareCode).toHaveBeenLastCalledWith(CODE, undefined);
    await request(app).get(`/api/v1/builds/${CODE}`).set(as);
    expect(service.getByShareCode).toHaveBeenLastCalledWith(CODE, 'u1');
  });

  it.each(['abc', 'Ab3dE9fG2', 'Ab3dE9fG2hX', 'Ab3dE9fG2!'])(
    'código inválido %s: 422',
    async (code) => {
      const { app, service } = setup();
      expect((await request(app).get(`/api/v1/builds/${code}`)).status).toBe(422);
      expect(service.getByShareCode).not.toHaveBeenCalled();
    },
  );

  it('clonar exige sesión y responde 201', async () => {
    const { app, service } = setup();
    expect((await request(app).post(`/api/v1/builds/${CODE}/clone`)).status).toBe(401);
    expect((await request(app).post(`/api/v1/builds/${CODE}/clone`).set(as)).status).toBe(201);
    expect(service.clone).toHaveBeenCalledWith('u1', CODE);
  });
});

describe('/me/builds y /me/wishlist', () => {
  it('todo exige sesión', async () => {
    const { app } = setup();
    for (const [method, url] of [
      ['get', '/api/v1/me/builds'],
      ['put', `/api/v1/me/builds/${ID}`],
      ['delete', `/api/v1/me/builds/${ID}`],
      ['get', '/api/v1/me/wishlist'],
      ['put', `/api/v1/me/wishlist/${CPU}`],
      ['delete', `/api/v1/me/wishlist/${CPU}`],
    ]) {
      expect((await request(app)[method](url)).status, `${method} ${url}`).toBe(401);
    }
  });

  it('lista, actualiza y borra armados propios', async () => {
    const { app, service } = setup();
    expect((await request(app).get('/api/v1/me/builds').set(as)).body).toEqual({ items: [] });
    expect((await request(app).put(`/api/v1/me/builds/${ID}`).set(as).send(valid)).status).toBe(
      200,
    );
    expect(service.update).toHaveBeenCalledWith(
      'u1',
      ID,
      expect.objectContaining({ items: valid.items }),
    );
    expect((await request(app).delete(`/api/v1/me/builds/${ID}`).set(as)).status).toBe(204);
    expect(service.remove).toHaveBeenCalledWith('u1', ID);
    expect((await request(app).delete('/api/v1/me/builds/abc').set(as)).status).toBe(422);
  });

  it('un armado ajeno propaga el 404', async () => {
    const { app, service } = setup();
    service.remove.mockRejectedValueOnce(new AppError('NOT_FOUND'));
    expect((await request(app).delete(`/api/v1/me/builds/${ID}`).set(as)).status).toBe(404);
  });

  it('favoritos: agregar y quitar responden 204; un id inválido, 422', async () => {
    const { app, service } = setup();
    expect((await request(app).get('/api/v1/me/wishlist').set(as)).body).toEqual({ items: [] });
    expect((await request(app).put(`/api/v1/me/wishlist/${CPU}`).set(as)).status).toBe(204);
    expect(service.addToWishlist).toHaveBeenCalledWith('u1', CPU);
    expect((await request(app).delete(`/api/v1/me/wishlist/${CPU}`).set(as)).status).toBe(204);
    expect(service.removeFromWishlist).toHaveBeenCalledWith('u1', CPU);
    expect((await request(app).put('/api/v1/me/wishlist/abc').set(as)).status).toBe(422);
  });
});
