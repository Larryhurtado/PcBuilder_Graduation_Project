// Perfil, cambio de contraseña, recuperación y eliminación de cuenta contra la base real.
// Las cuentas de prueba (accounttest-*) se borran al terminar.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';
import { createMemoryEmail } from '../../kernel/email.js';

const url = process.env.DATABASE_URL;
const stamp = Date.now();
const password = 'clave-segura-123';

describe.skipIf(!url)('cuenta contra PostgreSQL', () => {
  let pool;
  let db;
  let app;
  let mail;
  const buildIds = [];

  const cookieOf = (res) =>
    (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('refresh_token='));
  const cookieHeader = (res) => cookieOf(res).split(';')[0];
  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const tokenFromMail = (index = -1) => {
    const message = mail.sent.at(index);
    return /token=([^\s]+)/.exec(message.text)[1];
  };

  async function newUser(label, pass = password) {
    const email = `accounttest-${label}-${stamp}@demo.test`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: pass, fullName: `Cuenta ${label}`, acceptTerms: true });
    return { email, token: res.body.accessToken, cookie: cookieHeader(res), id: res.body.user.id };
  }
  const login = (email, pass) =>
    request(app).post('/api/v1/auth/login').send({ email, password: pass });

  beforeAll(() => {
    pool = createPool(url);
    db = createDb(pool);
    mail = createMemoryEmail();
    app = createApp({
      config: loadConfig({ NODE_ENV: 'test' }),
      pool,
      email: mail,
      rateLimits: { auth: { limit: 1000 }, forgot: { limit: 1000 } },
    });
  });

  afterAll(async () => {
    if (buildIds.length)
      await db.query('DELETE FROM builds.builds WHERE id = ANY($1::uuid[])', [buildIds]);
    // las cuentas eliminadas ya no tienen el correo de prueba: se borran por id
    const owners = `(SELECT id FROM identity.users WHERE email LIKE 'accounttest-%@demo.test' OR id = ANY($1::uuid[]))`;
    await db.query(`DELETE FROM stores.stores WHERE owner_user_id IN ${owners}`, [anonymizedIds]);
    await db.query(
      `DELETE FROM identity.users WHERE email LIKE 'accounttest-%@demo.test' OR id = ANY($1::uuid[])`,
      [anonymizedIds],
    );
    await pool.end();
  });
  const anonymizedIds = [];

  it('PATCH /me cambia el nombre y GET /me lo devuelve', async () => {
    const u = await newUser('perfil');
    const res = await request(app)
      .patch('/api/v1/me')
      .set(bearer(u.token))
      .send({ fullName: '  Nombre Nuevo ' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: u.id, fullName: 'Nombre Nuevo', email: u.email });
    expect((await request(app).get('/api/v1/me').set(bearer(u.token))).body.user.fullName).toBe(
      'Nombre Nuevo',
    );
    expect(
      (await request(app).patch('/api/v1/me').set(bearer(u.token)).send({ fullName: 'A' })).status,
    ).toBe(422);
  });

  it('POST /me/password: cambia la clave, cierra las demás sesiones y deja viva la de este dispositivo', async () => {
    const u = await newUser('clave');
    const otherDevice = await login(u.email, password); // otra sesión abierta
    const otherCookie = cookieHeader(otherDevice);

    const wrong = await request(app)
      .post('/api/v1/me/password')
      .set(bearer(u.token))
      .send({ currentPassword: 'clave-equivocada1', newPassword: 'clave-nueva-456' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
    expect((await login(u.email, password)).status).toBe(200); // la clave no cambió

    const res = await request(app)
      .post('/api/v1/me/password')
      .set(bearer(u.token))
      .send({ currentPassword: password, newPassword: 'clave-nueva-456' });
    expect(res.status).toBe(204);

    expect((await login(u.email, password)).status).toBe(401); // la vieja ya no sirve
    expect((await login(u.email, 'clave-nueva-456')).status).toBe(200);
    // la otra sesión quedó cerrada; este dispositivo recibió una cookie nueva que sí renueva
    expect(
      (await request(app).post('/api/v1/auth/refresh').set('Cookie', otherCookie)).status,
    ).toBe(401);
    const ownRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookieHeader(res));
    expect(ownRefresh.status).toBe(200);
    // la contraseña nueva debe cumplir las reglas del registro
    const weak = await request(app)
      .post('/api/v1/me/password')
      .set(bearer(u.token))
      .send({ currentPassword: 'clave-nueva-456', newPassword: 'corta' });
    expect(weak.status).toBe(422);
  });

  describe('recuperar contraseña', () => {
    it('forgot responde 200 igual exista o no el correo, y solo envía correo si existe', async () => {
      const u = await newUser('olvido');
      const before = mail.sent.length;
      const known = await request(app).post('/api/v1/auth/forgot').send({ email: u.email });
      const unknown = await request(app)
        .post('/api/v1/auth/forgot')
        .send({ email: `nadie-${stamp}@demo.test` });
      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(known.body).toEqual(unknown.body);
      expect(mail.sent.length).toBe(before + 1);
      expect(mail.sent.at(-1).to).toBe(u.email);
      expect(mail.sent.at(-1).text).toMatch(/\/restablecer\?token=/);

      // en la base solo queda el hash, no el token
      const token = tokenFromMail();
      const { rows } = await db.query(
        'SELECT token_hash FROM identity.password_reset_tokens WHERE user_id = $1',
        [u.id],
      );
      expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(rows[0].tokenHash).not.toContain(token);
    });

    it('reset: cambia la contraseña, cierra todas las sesiones y el enlace sirve una sola vez', async () => {
      const u = await newUser('reset');
      await request(app).post('/api/v1/auth/forgot').send({ email: u.email });
      const token = tokenFromMail();

      const ok = await request(app)
        .post('/api/v1/auth/reset')
        .send({ token, password: 'clave-restablecida-1' });
      expect(ok.status).toBe(204);
      expect((await login(u.email, password)).status).toBe(401);
      expect((await login(u.email, 'clave-restablecida-1')).status).toBe(200);
      expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', u.cookie)).status).toBe(
        401,
      );

      const again = await request(app)
        .post('/api/v1/auth/reset')
        .send({ token, password: 'otra-clave-999' });
      expect(again.status).toBe(400);
      expect(again.body.code).toBe('INVALID_RESET_TOKEN');
      expect((await login(u.email, 'clave-restablecida-1')).status).toBe(200); // no cambió
    });

    it('un enlace nuevo deja sin efecto el anterior', async () => {
      const u = await newUser('doble');
      await request(app).post('/api/v1/auth/forgot').send({ email: u.email });
      const first = tokenFromMail();
      await request(app).post('/api/v1/auth/forgot').send({ email: u.email });
      const second = tokenFromMail();
      expect(second).not.toBe(first);
      expect(
        (
          await request(app)
            .post('/api/v1/auth/reset')
            .send({ token: first, password: 'clave-nueva-456' })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(app)
            .post('/api/v1/auth/reset')
            .send({ token: second, password: 'clave-nueva-456' })
        ).status,
      ).toBe(204);
    });

    it('un enlace vencido (más de 15 minutos) o inventado da 400 INVALID_RESET_TOKEN', async () => {
      const u = await newUser('vencido');
      await request(app).post('/api/v1/auth/forgot').send({ email: u.email });
      const token = tokenFromMail();
      await db.query(
        "UPDATE identity.password_reset_tokens SET expires_at = now() - interval '1 second' WHERE user_id = $1",
        [u.id],
      );
      const expired = await request(app)
        .post('/api/v1/auth/reset')
        .send({ token, password: 'clave-nueva-456' });
      expect(expired.status).toBe(400);
      expect(expired.body.code).toBe('INVALID_RESET_TOKEN');
      const fake = await request(app)
        .post('/api/v1/auth/reset')
        .send({ token: 'inventado', password: 'clave-nueva-456' });
      expect(fake.status).toBe(400);
      expect((await login(u.email, password)).status).toBe(200); // la clave original sigue
    });

    it('el enlace dura 15 minutos', async () => {
      const u = await newUser('duracion');
      await request(app).post('/api/v1/auth/forgot').send({ email: u.email });
      const { rows } = await db.query(
        `SELECT extract(epoch FROM expires_at - created_at)::int AS seconds
           FROM identity.password_reset_tokens WHERE user_id = $1`,
        [u.id],
      );
      expect(rows[0].seconds).toBe(900);
    });

    it('forgot tiene un límite estricto por IP (429)', async () => {
      const limited = createApp({
        config: loadConfig({ NODE_ENV: 'test' }),
        pool,
        email: mail,
        rateLimits: { forgot: { limit: 2 } },
      });
      const go = () =>
        request(limited).post('/api/v1/auth/forgot').send({ email: 'nadie@demo.test' });
      expect((await go()).status).toBe(200);
      expect((await go()).status).toBe(200);
      const res = await go();
      expect(res.status).toBe(429);
      expect(res.body.code).toBe('RATE_LIMITED');
    });
  });

  describe('eliminar la cuenta', () => {
    it('anonimiza los datos, cierra sesiones, borra favoritos y deja los armados compartidos sin dueño', async () => {
      const u = await newUser('borrar');
      const component = (await request(app).get('/api/v1/offers?limit=1')).body.items[0].component;
      await request(app).put(`/api/v1/me/wishlist/${component.id}`).set(bearer(u.token));
      const build = await request(app)
        .post('/api/v1/builds')
        .set(bearer(u.token))
        .send({
          name: 'Compartido',
          items: [{ category: component.category, componentId: component.id }],
        });
      buildIds.push(build.body.build.id);
      anonymizedIds.push(u.id);

      const wrong = await request(app)
        .delete('/api/v1/me')
        .set(bearer(u.token))
        .send({ password: 'clave-equivocada1' });
      expect(wrong.status).toBe(401);
      expect((await login(u.email, password)).status).toBe(200); // sigue activa

      const res = await request(app).delete('/api/v1/me').set(bearer(u.token)).send({ password });
      expect(res.status).toBe(204);
      expect(cookieOf(res)).toMatch(/refresh_token=;/);

      const { rows } = await db.query(
        'SELECT email, full_name, status::text AS status, anonymized_at FROM identity.users WHERE id = $1',
        [u.id],
      );
      expect(rows[0].email).toBe(`eliminado-${u.id}@anonimizado.invalid`);
      expect(rows[0].fullName).toBe('Usuario eliminado');
      expect(rows[0].status).toBe('disabled');
      expect(rows[0].anonymizedAt).toBeInstanceOf(Date);

      expect((await login(u.email, password)).status).toBe(401); // el correo ya no existe
      expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', u.cookie)).status).toBe(
        401,
      );

      const shared = await request(app).get(`/api/v1/builds/${build.body.build.shareCode}`);
      expect(shared.status).toBe(200);
      expect(shared.body.build.isOwner).toBe(false);
      const owner = await db.query('SELECT user_id FROM builds.builds WHERE id = $1', [
        build.body.build.id,
      ]);
      expect(owner.rows[0].userId).toBeNull();
      const wish = await db.query(
        'SELECT count(*)::int AS n FROM builds.wishlist_items WHERE user_id = $1',
        [u.id],
      );
      expect(wish.rows[0].n).toBe(0);
    });

    it('el correo de una cuenta eliminada queda libre para registrarse de nuevo', async () => {
      const u = await newUser('reuso');
      anonymizedIds.push(u.id);
      await request(app).delete('/api/v1/me').set(bearer(u.token)).send({ password });
      const again = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: u.email, password, fullName: 'Misma persona', acceptTerms: true });
      expect(again.status).toBe(201);
    });

    it('una cuenta de vendedor no se elimina desde aquí (403)', async () => {
      const u = await newUser('vendedor');
      const converted = await request(app)
        .post('/api/v1/seller/convert')
        .set(bearer(u.token))
        .send({ legalName: 'Cuenta SAS', tradeName: 'Cuenta Store' });
      const res = await request(app)
        .delete('/api/v1/me')
        .set(bearer(converted.body.accessToken))
        .send({ password });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ROLE_FORBIDDEN');
      expect((await login(u.email, password)).status).toBe(200);
      await db.query('DELETE FROM stores.stores WHERE owner_user_id = $1', [u.id]);
    });
  });
});
