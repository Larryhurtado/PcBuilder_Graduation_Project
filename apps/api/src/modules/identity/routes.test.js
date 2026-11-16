import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from '../../http/auth.js';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createIdentityRouter } from './routes.js';

const USER = { id: 'u1', email: 'ana@correo.co', fullName: 'Ana', role: 'buyer' };
const session = (extra = {}) => ({
  accessToken: 'jwt',
  expiresIn: 900,
  user: USER,
  refreshToken: 'refresco-1',
  ...extra,
});

function setup({ rateLimitOptions, secureCookie } = {}) {
  const service = {
    register: vi.fn(async () => session()),
    login: vi.fn(async () => session()),
    refresh: vi.fn(async () => session({ refreshToken: 'refresco-2' })),
    logout: vi.fn(async () => {}),
    getMe: vi.fn(async () => USER),
  };
  const { requireAuth } = createAuthMiddleware((t) => {
    if (t !== 'bueno') throw new AppError('UNAUTHENTICATED');
    return { userId: 'u1', role: 'buyer' };
  });
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    '/api/v1',
    createIdentityRouter({ service, requireAuth, rateLimitOptions, secureCookie }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, service };
}

const valid = {
  email: 'ANA@Correo.co ',
  password: 'clave1234',
  fullName: 'Ana Pérez',
  acceptTerms: true,
};
const cookieOf = (res) =>
  (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('refresh_token='));

describe('POST /auth/register', () => {
  it('201: devuelve el token de acceso y el usuario, y el de refresco solo en cookie HttpOnly', async () => {
    const { app, service } = setup();
    const res = await request(app).post('/api/v1/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ accessToken: 'jwt', expiresIn: 900, user: USER });
    expect(JSON.stringify(res.body)).not.toContain('refresco-1');
    const cookie = cookieOf(res);
    expect(cookie).toContain('refresco-1');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toContain('Path=/api/v1/auth');
    expect(cookie).toMatch(/Max-Age=604800/);
    expect(cookie).not.toMatch(/Secure/i);
    // el correo llega normalizado al servicio
    expect(service.register.mock.calls[0][0].email).toBe('ana@correo.co');
  });

  it('en producción la cookie es Secure', async () => {
    const { app } = setup({ secureCookie: true });
    const res = await request(app).post('/api/v1/auth/register').send(valid);
    expect(cookieOf(res)).toMatch(/Secure/i);
  });

  it.each([
    ['sin aceptar el tratamiento de datos', { acceptTerms: false }],
    ['sin el campo acceptTerms', { acceptTerms: undefined }],
    ['clave corta', { password: 'a1' }],
    ['clave sin número', { password: 'solo-letras' }],
    ['clave sin letra', { password: '12345678' }],
    ['correo inválido', { email: 'no-es-correo' }],
    ['nombre muy corto', { fullName: 'A' }],
    ['rol enviado por el cliente', { role: 'admin' }],
  ])('422: %s', async (_n, patch) => {
    const { app, service } = setup();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...valid, ...patch });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(service.register).not.toHaveBeenCalled();
  });

  it('correo repetido: 409 EMAIL_TAKEN y no deja cookie', async () => {
    const { app, service } = setup();
    service.register.mockRejectedValueOnce(new AppError('EMAIL_TAKEN'));
    const res = await request(app).post('/api/v1/auth/register').send(valid);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
    expect(cookieOf(res)).toBeUndefined();
  });
});

describe('POST /auth/login', () => {
  it('200 con sesión y cookie', async () => {
    const { app, service } = setup();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@correo.co', password: 'cualquiera' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('jwt');
    expect(cookieOf(res)).toContain('refresco-1');
    expect(service.login).toHaveBeenCalledWith({ email: 'ana@correo.co', password: 'cualquiera' });
  });

  it('credenciales incorrectas: 401 INVALID_CREDENTIALS', async () => {
    const { app, service } = setup();
    service.login.mockRejectedValueOnce(new AppError('INVALID_CREDENTIALS'));
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ana@correo.co', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('cuerpo incompleto: 422', async () => {
    const { app } = setup();
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email: 'ana@correo.co' })).status,
    ).toBe(422);
  });

  it('el límite de intentos responde 429 RATE_LIMITED', async () => {
    const { app } = setup({ rateLimitOptions: { limit: 2 } });
    const go = () =>
      request(app).post('/api/v1/auth/login').send({ email: 'ana@correo.co', password: 'x' });
    expect((await go()).status).toBe(200);
    expect((await go()).status).toBe(200);
    const limited = await go();
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
  });
});

describe('POST /auth/refresh', () => {
  it('lee la cookie, entrega sesión nueva y rota la cookie', async () => {
    const { app, service } = setup();
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refresh_token=refresco-1');
    expect(res.status).toBe(200);
    expect(service.refresh).toHaveBeenCalledWith('refresco-1');
    expect(cookieOf(res)).toContain('refresco-2');
  });

  it('con cookie inválida: 401 y se borra la cookie', async () => {
    const { app, service } = setup();
    service.refresh.mockRejectedValueOnce(new AppError('UNAUTHENTICATED'));
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', 'refresh_token=mala');
    expect(res.status).toBe(401);
    expect(cookieOf(res)).toMatch(/refresh_token=;/);
  });

  it('sin cookie el servicio recibe undefined', async () => {
    const { app, service } = setup();
    await request(app).post('/api/v1/auth/refresh');
    expect(service.refresh).toHaveBeenCalledWith(undefined);
  });
});

describe('POST /auth/logout', () => {
  it('204, revoca el token y borra la cookie', async () => {
    const { app, service } = setup();
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'refresh_token=refresco-1');
    expect(res.status).toBe(204);
    expect(service.logout).toHaveBeenCalledWith('refresco-1');
    expect(cookieOf(res)).toMatch(/refresh_token=;/);
  });

  it('sin sesión también responde 204', async () => {
    const { app } = setup();
    expect((await request(app).post('/api/v1/auth/logout')).status).toBe(204);
  });
});

describe('GET /me', () => {
  it('con token válido devuelve el usuario', async () => {
    const { app, service } = setup();
    const res = await request(app).get('/api/v1/me').set('Authorization', 'Bearer bueno');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: USER });
    expect(service.getMe).toHaveBeenCalledWith('u1');
  });

  it('sin token: 401', async () => {
    const { app } = setup();
    expect((await request(app).get('/api/v1/me')).status).toBe(401);
  });
});
