import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from '../../http/auth.js';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createSellerOffersRouter } from './seller-routes.js';

const OFFER = '6b03b443-7b22-491c-b301-7e2a285359df';
const COMPONENT = '0b7e7c0e-3f5e-4c43-a6a3-1c3b7f0a9d11';
const TOKENS = { seller: { userId: 'u1', role: 'seller' }, buyer: { userId: 'b1', role: 'buyer' } };
const as = (role) => ({ Authorization: `Bearer ${role}` });

function setup() {
  const service = {
    presignImage: vi.fn(async () => ({ uploadUrl: '/up', storageKey: 'offers/s1/x.png' })),
    storeImage: vi.fn(async () => {}),
    create: vi.fn(async () => ({ offerId: OFFER })),
    list: vi.fn(async () => []),
    update: vi.fn(async () => ({ offerId: OFFER })),
    setVisibility: vi.fn(async () => ({ offerId: OFFER })),
    remove: vi.fn(async () => {}),
  };
  const auth = createAuthMiddleware((t) => {
    if (!TOKENS[t]) throw new AppError('UNAUTHENTICATED');
    return TOKENS[t];
  });
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use('/api/v1', createSellerOffersRouter({ service, auth }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, service };
}

const valid = { componentId: COMPONENT, priceCop: 1500000, condition: 'new' };

describe('seguridad', () => {
  it.each([
    ['post', '/api/v1/seller/offers'],
    ['get', '/api/v1/seller/offers'],
    ['patch', `/api/v1/seller/offers/${OFFER}`],
    ['patch', `/api/v1/seller/offers/${OFFER}/visibility`],
    ['delete', `/api/v1/seller/offers/${OFFER}`],
    ['post', '/api/v1/seller/offers/images/presign'],
  ])('%s %s: sin sesión 401 y comprador 403', async (method, url) => {
    const { app } = setup();
    expect((await request(app)[method](url)).status).toBe(401);
    expect((await request(app)[method](url).set(as('buyer'))).status).toBe(403);
  });
});

describe('POST /seller/offers', () => {
  it('201 con valores por defecto (garantía 0, sin descripción ni fotos)', async () => {
    const { app, service } = setup();
    const res = await request(app).post('/api/v1/seller/offers').set(as('seller')).send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ offer: { offerId: OFFER } });
    expect(service.create).toHaveBeenCalledWith('u1', {
      ...valid,
      warrantyMonths: 0,
      description: null,
      imageKeys: [],
    });
  });

  it.each([
    ['precio 0', { priceCop: 0 }],
    ['precio negativo', { priceCop: -5 }],
    ['precio con decimales', { priceCop: 1500.5 }],
    ['precio de más de 12 dígitos', { priceCop: 1_000_000_000_000 }],
    ['estado desconocido', { condition: 'refurbished' }],
    ['garantía de 121 meses', { warrantyMonths: 121 }],
    ['descripción de más de 1000 caracteres', { description: 'x'.repeat(1001) }],
    ['6 fotos', { imageKeys: ['a', 'b', 'c', 'd', 'e', 'f'] }],
    ['componente que no es UUID', { componentId: 'abc' }],
    ['tienda enviada por el cliente', { storeId: 'otra' }],
  ])('422: %s', async (_n, patch) => {
    const { app, service } = setup();
    const res = await request(app)
      .post('/api/v1/seller/offers')
      .set(as('seller'))
      .send({ ...valid, ...patch });
    expect(res.status).toBe(422);
    expect(service.create).not.toHaveBeenCalled();
  });
});

describe('PATCH, visibilidad, DELETE y GET', () => {
  it('PATCH edita precio y datos; no permite cambiar producto ni estado, ni cuerpo vacío', async () => {
    const { app, service } = setup();
    const url = `/api/v1/seller/offers/${OFFER}`;
    expect(
      (await request(app).patch(url).set(as('seller')).send({ priceCop: 1400000 })).status,
    ).toBe(200);
    expect(service.update).toHaveBeenCalledWith('u1', OFFER, { priceCop: 1400000 });
    for (const bad of [{}, { componentId: COMPONENT }, { condition: 'used' }, { priceCop: 0 }]) {
      expect((await request(app).patch(url).set(as('seller')).send(bad)).status).toBe(422);
    }
  });

  it('visibility acepta active o paused', async () => {
    const { app, service } = setup();
    const url = `/api/v1/seller/offers/${OFFER}/visibility`;
    expect(
      (await request(app).patch(url).set(as('seller')).send({ status: 'paused' })).status,
    ).toBe(200);
    expect(service.setVisibility).toHaveBeenCalledWith('u1', OFFER, 'paused');
    expect(
      (await request(app).patch(url).set(as('seller')).send({ status: 'deleted' })).status,
    ).toBe(422);
  });

  it('un id que no es UUID da 422 y DELETE responde 204', async () => {
    const { app, service } = setup();
    expect((await request(app).delete('/api/v1/seller/offers/abc').set(as('seller'))).status).toBe(
      422,
    );
    const res = await request(app).delete(`/api/v1/seller/offers/${OFFER}`).set(as('seller'));
    expect(res.status).toBe(204);
    expect(service.remove).toHaveBeenCalledWith('u1', OFFER);
  });

  it('GET devuelve el inventario y los errores del servicio llegan con su código', async () => {
    const { app, service } = setup();
    expect((await request(app).get('/api/v1/seller/offers').set(as('seller'))).body).toEqual({
      items: [],
    });
    service.update.mockRejectedValueOnce(new AppError('STORE_NOT_VERIFIED'));
    const res = await request(app)
      .patch(`/api/v1/seller/offers/${OFFER}`)
      .set(as('seller'))
      .send({ priceCop: 5 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('STORE_NOT_VERIFIED');
  });
});

describe('fotos', () => {
  it('presign valida tipo y tamaño', async () => {
    const { app, service } = setup();
    const url = '/api/v1/seller/offers/images/presign';
    const ok = await request(app)
      .post(url)
      .set(as('seller'))
      .send({ fileName: 'a.png', mimeType: 'image/png', sizeBytes: 1000 });
    expect(ok.status).toBe(200);
    expect(ok.body.storageKey).toBe('offers/s1/x.png');
    expect(service.presignImage).toHaveBeenCalledWith('u1', {
      fileName: 'a.png',
      mimeType: 'image/png',
      sizeBytes: 1000,
    });
    for (const bad of [
      { fileName: 'a.gif', mimeType: 'image/gif', sizeBytes: 10 },
      { fileName: 'a.png', mimeType: 'image/png', sizeBytes: 6 * 1024 * 1024 },
      { fileName: 'a.png', mimeType: 'image/png', sizeBytes: 0 },
      { mimeType: 'image/png', sizeBytes: 10 },
    ]) {
      expect((await request(app).post(url).set(as('seller')).send(bad)).status).toBe(422);
    }
  });

  it('PUT pasa los bytes, el tipo y el nombre al servicio y responde 204', async () => {
    const { app, service } = setup();
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const res = await request(app)
      .put('/api/v1/seller/offers/images/abc.png')
      .set(as('seller'))
      .set('Content-Type', 'image/png')
      .send(bytes);
    expect(res.status).toBe(204);
    const [userId, input] = service.storeImage.mock.calls[0];
    expect(userId).toBe('u1');
    expect(input.name).toBe('abc.png');
    expect(input.mimeType).toBe('image/png');
    expect(Buffer.compare(input.bytes, bytes)).toBe(0);
  });

  it('un archivo de más de 5 MB responde 422 FILE_REJECTED', async () => {
    const { app, service } = setup();
    const res = await request(app)
      .put('/api/v1/seller/offers/images/abc.png')
      .set(as('seller'))
      .set('Content-Type', 'image/png')
      .send(Buffer.alloc(5 * 1024 * 1024 + 10));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('FILE_REJECTED');
    expect(service.storeImage).not.toHaveBeenCalled();
  });

  it('un tipo distinto no se lee como archivo: el servicio lo rechaza', async () => {
    const { app, service } = setup();
    service.storeImage.mockRejectedValueOnce(new AppError('FILE_REJECTED'));
    const res = await request(app)
      .put('/api/v1/seller/offers/images/abc.png')
      .set(as('seller'))
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.from('x'));
    expect(res.status).toBe(422);
    expect(service.storeImage.mock.calls[0][1].mimeType).toBe('application/octet-stream');
  });
});
