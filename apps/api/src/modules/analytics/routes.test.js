import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createAnalyticsRouter } from './routes.js';

const OFFER = '6b03b443-7b22-491c-b301-7e2a285359df';

function appWith(service, rateLimitOptions) {
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use('/api/v1', createAnalyticsRouter({ service, rateLimitOptions }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
const service = () => ({ record: vi.fn(async () => ({ recorded: true })) });

describe('POST /events', () => {
  it('con JSON responde 204 sin cuerpo y pasa el agente de usuario', async () => {
    const s = service();
    const res = await request(appWith(s))
      .post('/api/v1/events')
      .set('User-Agent', 'Firefox/130')
      .send({ offerId: OFFER, type: 'whatsapp_click' });
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const [event, context] = s.record.mock.calls[0];
    expect(event).toEqual({ offerId: OFFER, type: 'whatsapp_click' });
    expect(context.userAgent).toBe('Firefox/130');
    expect(context.ip).toBeTruthy();
  });

  it('sendBeacon con texto (text/plain) también funciona', async () => {
    const s = service();
    const res = await request(appWith(s))
      .post('/api/v1/events')
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .send(JSON.stringify({ offerId: OFFER, type: 'view' }));
    expect(res.status).toBe(204);
    expect(s.record.mock.calls[0][0]).toEqual({ offerId: OFFER, type: 'view' });
  });

  it('un texto que no es JSON responde 400', async () => {
    const s = service();
    const res = await request(appWith(s))
      .post('/api/v1/events')
      .set('Content-Type', 'text/plain')
      .send('hola');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(s.record).not.toHaveBeenCalled();
  });

  it.each([
    ['sin cuerpo', undefined],
    ['tipo desconocido', { offerId: OFFER, type: 'compra' }],
    ['oferta que no es UUID', { offerId: 'abc', type: 'view' }],
    ['campo extra', { offerId: OFFER, type: 'view', userId: 'x' }],
    ['sin tipo', { offerId: OFFER }],
  ])('rechaza con 422: %s', async (_name, body) => {
    const s = service();
    const req = request(appWith(s)).post('/api/v1/events');
    const res = body === undefined ? await req : await req.send(body);
    expect(res.status).toBe(422);
    expect(s.record).not.toHaveBeenCalled();
  });

  it('una oferta que no es pública propaga el 404', async () => {
    const s = {
      record: async () => {
        throw new AppError('NOT_FOUND', { message: 'La oferta no está disponible.' });
      },
    };
    const res = await request(appWith(s))
      .post('/api/v1/events')
      .send({ offerId: OFFER, type: 'view' });
    expect(res.status).toBe(404);
  });

  it('el límite de tasa responde 429 RATE_LIMITED con el formato estándar', async () => {
    const s = service();
    const app = appWith(s, { limit: 2, windowMs: 60_000 });
    const send = () => request(app).post('/api/v1/events').send({ offerId: OFFER, type: 'view' });
    expect((await send()).status).toBe(204);
    expect((await send()).status).toBe(204);
    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
    expect(limited.body.requestId).toEqual(expect.any(String));
    expect(s.record).toHaveBeenCalledTimes(2);
  });
});
