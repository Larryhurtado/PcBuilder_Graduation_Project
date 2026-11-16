import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppError } from '../kernel/errors.js';
import { createAuthMiddleware } from './auth.js';
import { errorHandler } from './error-handler.js';
import { requestId } from './request-id.js';

const authenticate = (token) => {
  if (token === 'vencido') throw new AppError('TOKEN_EXPIRED');
  if (token === 'seller-token') return { userId: 's1', role: 'seller' };
  if (token === 'buyer-token') return { userId: 'b1', role: 'buyer' };
  throw new AppError('UNAUTHENTICATED');
};

const { requireAuth, requireRole } = createAuthMiddleware(authenticate);
const app = express();
app.use(requestId);
app.get('/privada', requireAuth, (req, res) => res.json(req.user));
app.get('/vendedor', requireAuth, requireRole('seller', 'admin'), (_req, res) =>
  res.json({ ok: true }),
);
app.use(errorHandler);

describe('requireAuth', () => {
  it('deja pasar un Bearer válido y pone el usuario en req.user', async () => {
    const res = await request(app).get('/privada').set('Authorization', 'Bearer buyer-token');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'b1', role: 'buyer' });
  });

  it.each([
    ['sin encabezado', undefined],
    ['esquema distinto', 'Basic abc'],
    ['sin token', 'Bearer '],
    ['token inválido', 'Bearer basura'],
  ])('401 UNAUTHENTICATED: %s', async (_n, header) => {
    const req = request(app).get('/privada');
    const res = header === undefined ? await req : await req.set('Authorization', header);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('un token vencido responde 401 TOKEN_EXPIRED para que el frontend refresque', async () => {
    const res = await request(app).get('/privada').set('Authorization', 'Bearer vencido');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });
});

describe('requireRole', () => {
  it('permite el rol indicado', async () => {
    const res = await request(app).get('/vendedor').set('Authorization', 'Bearer seller-token');
    expect(res.status).toBe(200);
  });

  it('un rol distinto recibe 403 ROLE_FORBIDDEN', async () => {
    const res = await request(app).get('/vendedor').set('Authorization', 'Bearer buyer-token');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROLE_FORBIDDEN');
  });
});
