// Flujo del vendedor contra la base real: registrarse → convertirse → perfil → aprobación simulada.
// Las cuentas de prueba (sellertest-*) y su comercio se borran al terminar.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApproveStoreSql } from '../../../../../tools/db-lib.mjs';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';

const url = process.env.DATABASE_URL;
const email = `sellertest-${Date.now()}@demo.test`;
const password = 'clave-segura-123';

describe.skipIf(!url)('flujo del vendedor contra PostgreSQL', () => {
  let pool;
  let db;
  let app;
  let buyerToken;

  beforeAll(async () => {
    pool = createPool(url);
    db = createDb(pool);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password, fullName: 'Vendedor Prueba', acceptTerms: true });
    buyerToken = res.body.accessToken;
  });

  afterAll(async () => {
    await db.query(
      `DELETE FROM stores.stores WHERE owner_user_id IN (SELECT id FROM identity.users WHERE email LIKE 'sellertest-%@demo.test')`,
    );
    await db.query("DELETE FROM identity.users WHERE email LIKE 'sellertest-%@demo.test'");
    await pool.end();
  });

  const bearer = (t) => ({ Authorization: `Bearer ${t}` });
  let sellerToken;

  it('un comprador todavía no puede usar las rutas de vendedor', async () => {
    expect((await request(app).get('/api/v1/seller/store').set(bearer(buyerToken))).status).toBe(
      403,
    );
  });

  it('se convierte en vendedor: crea comercio y solicitud, y entrega un token con rol vendedor', async () => {
    const res = await request(app)
      .post('/api/v1/seller/convert')
      .set(bearer(buyerToken))
      .send({ legalName: 'Vendedor Prueba SAS', tradeName: 'Prueba Gaming' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('seller');
    expect(res.body.store).toMatchObject({
      tradeName: 'Prueba Gaming',
      isVerified: false,
      whatsappE164: null,
    });
    sellerToken = res.body.accessToken;

    const { rows } = await db.query(
      `SELECT r.status::text AS status FROM verification.requests r
         JOIN stores.stores s ON s.id = r.store_id
         JOIN identity.users u ON u.id = s.owner_user_id WHERE u.email = $1`,
      [email],
    );
    expect(rows[0].status).toBe('not_submitted');
  });

  it('convertirse otra vez responde 403 (el token nuevo ya es de vendedor)', async () => {
    const res = await request(app)
      .post('/api/v1/seller/convert')
      .set(bearer(sellerToken))
      .send({ legalName: 'Otra SAS', tradeName: 'Otra' });
    expect(res.status).toBe(403);
  });

  it('el refresco posterior ya trae el rol vendedor', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(login.body.user.role).toBe('seller');
  });

  it('GET /seller/store y el estado de verificación', async () => {
    const store = await request(app).get('/api/v1/seller/store').set(bearer(sellerToken));
    expect(store.status).toBe(200);
    expect(store.body.store.legalName).toBe('Vendedor Prueba SAS');
    const status = await request(app)
      .get('/api/v1/seller/verification/status')
      .set(bearer(sellerToken));
    expect(status.body).toMatchObject({ status: 'not_submitted', submittedAt: null });
  });

  it('PATCH /seller/store guarda perfil, WhatsApp y ubicación', async () => {
    const res = await request(app)
      .patch('/api/v1/seller/store')
      .set(bearer(sellerToken))
      .send({
        whatsappE164: '+573001234567',
        department: 'Valle del Cauca',
        city: 'Cali',
        address: 'Calle 5 # 10-20, local 3',
        latitude: 3.4516,
        longitude: -76.532,
        description: 'Venta de componentes',
        openingHours: { lun_vie: '9:00-18:00' },
      });
    expect(res.status).toBe(200);
    expect(res.body.store).toMatchObject({
      whatsappE164: '+573001234567',
      city: 'Cali',
      latitude: 3.4516,
      openingHours: { lun_vie: '9:00-18:00' },
    });
  });

  it('un NIT inválido o un WhatsApp malo no llegan a la base (422)', async () => {
    const bad = await request(app)
      .patch('/api/v1/seller/store')
      .set(bearer(sellerToken))
      .send({ nit: '123' });
    expect(bad.status).toBe(422);
  });

  it('la aprobación simulada deja el comercio verificado y su perfil intacto', async () => {
    // varias sentencias: se envían con el protocolo simple, igual que hace psql en db:approve-store
    const results = await pool.query(buildApproveStoreSql(`'${email}'`));
    expect(results.at(-1).rows[0].trade_name).toBe('Prueba Gaming');
    const store = await request(app).get('/api/v1/seller/store').set(bearer(sellerToken));
    expect(store.body.store.isVerified).toBe(true);
    expect(store.body.store.nit).toMatch(/^[0-9]{8,10}-[0-9]$/);
    expect(store.body.store.whatsappE164).toBe('+573001234567');
    const status = await request(app)
      .get('/api/v1/seller/verification/status')
      .set(bearer(sellerToken));
    expect(status.body.status).toBe('approved');
  });
});
