// Autenticación contra la base real. Las cuentas de prueba (authtest-*) se borran al terminar.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';

const url = process.env.DATABASE_URL;
const email = `authtest-${Date.now()}@demo.test`;
const password = 'clave-segura-123';

describe.skipIf(!url)('autenticación contra PostgreSQL', () => {
  let pool;
  let db;
  let app;

  beforeAll(() => {
    pool = createPool(url);
    db = createDb(pool);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
  });

  afterAll(async () => {
    await db.query("DELETE FROM identity.users WHERE email LIKE 'authtest-%@demo.test'");
    await pool.end();
  });

  const cookieOf = (res) =>
    (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('refresh_token='));
  const tokenFrom = (res) => /refresh_token=([^;]+)/.exec(cookieOf(res))[1];
  const register = (body = {}) =>
    request(app)
      .post('/api/v1/auth/register')
      .send({ email, password, fullName: 'Prueba Auth', acceptTerms: true, ...body });

  let registered;
  it('registra una cuenta de comprador y guarda solo hashes', async () => {
    registered = await register();
    expect(registered.status).toBe(201);
    expect(registered.body.user).toMatchObject({ email, fullName: 'Prueba Auth', role: 'buyer' });

    const { rows } = await db.query(
      `SELECT password_hash, terms_accepted_at, privacy_policy_version, status::text AS status
         FROM identity.users WHERE email = $1`,
      [email],
    );
    expect(rows[0].passwordHash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].passwordHash).not.toContain(password);
    expect(rows[0].termsAcceptedAt).toBeInstanceOf(Date);
    expect(rows[0].privacyPolicyVersion).toBe('2026-01');

    const stored = await db.query(
      `SELECT token_hash FROM identity.refresh_tokens rt JOIN identity.users u ON u.id = rt.user_id WHERE u.email = $1`,
      [email],
    );
    expect(stored.rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.rows[0].tokenHash).not.toBe(tokenFrom(registered));
  });

  it('el mismo correo (aunque cambien mayúsculas) responde 409 EMAIL_TAKEN', async () => {
    const res = await register({ email: email.toUpperCase() });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('GET /me con el token de acceso devuelve al usuario; sin token, 401', async () => {
    const me = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${registered.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
    expect((await request(app).get('/api/v1/me')).status).toBe(401);
  });

  it('login: correcto entra y marca el último acceso; clave errónea y correo inexistente dan 401 igual', async () => {
    const ok = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(ok.status).toBe(200);
    const { rows } = await db.query('SELECT last_login_at FROM identity.users WHERE email = $1', [
      email,
    ]);
    expect(rows[0].lastLoginAt).toBeInstanceOf(Date);

    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'otra-clave-999' });
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nadie@demo.test', password });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('refresh rota el token; reusar el anterior cierra todas las sesiones', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const first = tokenFrom(login);

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${first}`);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.user.email).toBe(email);
    const second = tokenFrom(refreshed);
    expect(second).not.toBe(first);

    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${first}`);
    expect(reuse.status).toBe(401);
    const afterTheft = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${second}`);
    expect(afterTheft.status).toBe(401);
  });

  it('logout revoca el token: después ya no sirve para refrescar', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const token = tokenFrom(login);
    expect(
      (await request(app).post('/api/v1/auth/logout').set('Cookie', `refresh_token=${token}`))
        .status,
    ).toBe(204);
    expect(
      (await request(app).post('/api/v1/auth/refresh').set('Cookie', `refresh_token=${token}`))
        .status,
    ).toBe(401);
  });

  it('un token vencido en la base no sirve', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    await db.query(
      `UPDATE identity.refresh_tokens SET expires_at = now() - interval '1 minute'
        WHERE user_id = (SELECT id FROM identity.users WHERE email = $1) AND revoked_at IS NULL`,
      [email],
    );
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${tokenFrom(login)}`);
    expect(res.status).toBe(401);
  });

  it('una cuenta deshabilitada no puede iniciar sesión (403)', async () => {
    await db.query("UPDATE identity.users SET status = 'disabled' WHERE email = $1", [email]);
    const res = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROLE_FORBIDDEN');
  });

  it('el rol no se puede pedir al registrarse', async () => {
    const res = await register({ email: `authtest-rol-${Date.now()}@demo.test`, role: 'admin' });
    expect(res.status).toBe(422);
  });
});
