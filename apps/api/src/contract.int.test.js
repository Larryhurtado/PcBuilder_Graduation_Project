// El frontend valida cada respuesta con los esquemas de @hw/contracts: una respuesta que no los
// cumpla rompe la pantalla. Esta prueba llama a los endpoints reales y parsea cada respuesta con
// el esquema que le corresponde. Las cuentas de prueba (contracttest-*) se borran al terminar.
import {
  analyticsSummarySchema,
  authResponseSchema,
  buildListResponseSchema,
  componentSchema,
  componentSearchResponseSchema,
  constraintsResponseSchema,
  convertResponseSchema,
  featuredOffersResponseSchema,
  meResponseSchema,
  offerDetailSchema,
  offerListResponseSchema,
  presignResponseSchema,
  publicStoreSchema,
  publicStoresResponseSchema,
  savedBuildResponseSchema,
  sellerOfferResponseSchema,
  sellerOffersResponseSchema,
  storeResponseSchema,
  validateResponseSchema,
  verificationStatusSchema,
  wishlistResponseSchema,
} from '@hw/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApproveStoreSql } from '../../../tools/db-lib.mjs';
import { createApp } from './app.js';
import { loadConfig } from './kernel/config.js';
import { createDb, createPool } from './kernel/db.js';

const url = process.env.DATABASE_URL;
const stamp = Date.now();
const password = 'clave-segura-123';

describe.skipIf(!url)('las respuestas de la API cumplen los esquemas de @hw/contracts', () => {
  let pool;
  let db;
  let app;
  let buyer;
  let seller;
  let offer; // una oferta pública del seed
  let storeId;
  let itemsA;
  const buildIds = [];

  const bearer = (u) => ({ Authorization: `Bearer ${u.token}` });

  async function newUser(label) {
    const email = `contracttest-${label}-${stamp}@demo.test`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password, fullName: `Contrato ${label}`, acceptTerms: true });
    return { email, token: res.body.accessToken, registerBody: res.body };
  }

  beforeAll(async () => {
    pool = createPool(url);
    db = createDb(pool);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
    buyer = await newUser('buyer');
    seller = await newUser('seller');
    const { rows } = await db.query(
      `SELECT bi.category::text AS category, bi.component_id AS "componentId"
         FROM builds.builds b JOIN builds.build_items bi ON bi.build_id = b.id
        WHERE b.share_code = 'Ab3dE9fG2h' ORDER BY bi.category`,
    );
    itemsA = rows;
    offer = (await request(app).get('/api/v1/offers?limit=1')).body.items[0];
  });

  afterAll(async () => {
    if (buildIds.length) {
      await db.query('DELETE FROM builds.builds WHERE id = ANY($1::uuid[])', [buildIds]);
    }
    const owners = "(SELECT id FROM identity.users WHERE email LIKE 'contracttest-%@demo.test')";
    await db.query(
      `DELETE FROM offers.offers WHERE store_id IN (SELECT id FROM stores.stores WHERE owner_user_id IN ${owners})`,
    );
    await db.query(`DELETE FROM stores.stores WHERE owner_user_id IN ${owners}`);
    await db.query("DELETE FROM identity.users WHERE email LIKE 'contracttest-%@demo.test'");
    await pool.end();
  });

  it('sesión: registro, login, refresco y /me', async () => {
    authResponseSchema.parse(buyer.registerBody);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: buyer.email, password });
    authResponseSchema.parse(login.body);
    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set(
        'Cookie',
        login.headers['set-cookie'].map((c) => c.split(';')[0]),
      );
    authResponseSchema.parse(refresh.body);
    const me = await request(app).get('/api/v1/me').set(bearer(buyer));
    meResponseSchema.parse(me.body);
  });

  it('catálogo público: ofertas, destacadas, detalle, ficha y buscador', async () => {
    offerListResponseSchema.parse(
      (await request(app).get('/api/v1/offers?includeSpecs=true&limit=10')).body,
    );
    featuredOffersResponseSchema.parse((await request(app).get('/api/v1/offers/featured')).body);
    offerDetailSchema.parse((await request(app).get(`/api/v1/offers/${offer.offerId}`)).body);
    componentSchema.parse(
      (await request(app).get(`/api/v1/components/${offer.component.id}`)).body,
    );
    componentSearchResponseSchema.parse(
      (await request(app).get('/api/v1/catalog/search?q=ryzen')).body,
    );
  });

  it('todas las categorías con sus especificaciones cumplen el esquema', async () => {
    const res = await request(app).get('/api/v1/offers?includeSpecs=true&limit=50');
    const categories = new Set();
    for (const item of res.body.items) {
      categories.add(item.component.category);
      const full = await request(app).get(`/api/v1/components/${item.component.id}`);
      componentSchema.parse(full.body);
    }
    expect(categories.size).toBeGreaterThan(1);
  });

  it('comercios: directorio y detalle', async () => {
    const list = await request(app).get('/api/v1/stores');
    publicStoresResponseSchema.parse(list.body);
    for (const store of list.body.items) {
      publicStoreSchema.parse((await request(app).get(`/api/v1/stores/${store.id}`)).body);
    }
  });

  it('compatibilidad: validate (incluye reglas con message null) y constraints', async () => {
    const full = await request(app).post('/api/v1/compat/validate').send({ items: itemsA });
    validateResponseSchema.parse(full.body);
    // con pocas piezas hay reglas "not_applicable" con message null
    const partial = await request(app)
      .post('/api/v1/compat/validate')
      .send({ items: itemsA.filter((i) => i.category === 'cpu') });
    expect(partial.body.results.some((r) => r.message === null)).toBe(true);
    validateResponseSchema.parse(partial.body);
    const constraints = await request(app)
      .post('/api/v1/compat/constraints')
      .send({ category: 'motherboard', items: itemsA.filter((i) => i.category === 'cpu') });
    constraintsResponseSchema.parse(constraints.body);
  });

  it('armados y favoritos', async () => {
    const saved = await request(app)
      .post('/api/v1/builds')
      .set(bearer(buyer))
      .send({ name: 'Contrato', items: itemsA });
    buildIds.push(saved.body.build.id);
    savedBuildResponseSchema.parse(saved.body);
    const shared = await request(app).get(`/api/v1/builds/${saved.body.build.shareCode}`);
    savedBuildResponseSchema.parse(shared.body);
    // un armado parcial también trae reglas con message null
    const partial = await request(app)
      .post('/api/v1/builds')
      .set(bearer(buyer))
      .send({ items: itemsA.filter((i) => i.category === 'cpu') });
    buildIds.push(partial.body.build.id);
    savedBuildResponseSchema.parse(partial.body);
    const clone = await request(app)
      .post(`/api/v1/builds/${saved.body.build.shareCode}/clone`)
      .set(bearer(buyer));
    buildIds.push(clone.body.build.id);
    savedBuildResponseSchema.parse(clone.body);
    savedBuildResponseSchema.parse(
      (
        await request(app)
          .put(`/api/v1/me/builds/${saved.body.build.id}`)
          .set(bearer(buyer))
          .send({ name: 'Otro', items: itemsA })
      ).body,
    );
    buildListResponseSchema.parse(
      (await request(app).get('/api/v1/me/builds').set(bearer(buyer))).body,
    );

    await request(app).put(`/api/v1/me/wishlist/${offer.component.id}`).set(bearer(buyer));
    const wishlist = await request(app).get('/api/v1/me/wishlist').set(bearer(buyer));
    wishlistResponseSchema.parse(wishlist.body);
    expect(wishlist.body.items).toHaveLength(1);
  });

  it('vendedor: convertir, tienda, verificación, publicar, inventario y panel', async () => {
    const converted = await request(app)
      .post('/api/v1/seller/convert')
      .set(bearer(seller))
      .send({ legalName: 'Contrato SAS', tradeName: 'Contrato Store' });
    convertResponseSchema.parse(converted.body);
    seller.token = converted.body.accessToken;
    storeId = converted.body.store.id;
    expect(storeId).toBeDefined();

    storeResponseSchema.parse(
      (await request(app).get('/api/v1/seller/store').set(bearer(seller))).body,
    );
    const patched = await request(app).patch('/api/v1/seller/store').set(bearer(seller)).send({
      whatsappE164: '+573001234567',
      city: 'Cali',
      department: 'Valle del Cauca',
      address: 'Calle 1 # 2-3',
    });
    storeResponseSchema.parse(patched.body);
    verificationStatusSchema.parse(
      (await request(app).get('/api/v1/seller/verification/status').set(bearer(seller))).body,
    );

    await pool.query(buildApproveStoreSql(`'${seller.email}'`));

    const presign = await request(app)
      .post('/api/v1/seller/offers/images/presign')
      .set(bearer(seller))
      .send({ fileName: 'a.png', mimeType: 'image/png', sizeBytes: 100 });
    presignResponseSchema.parse(presign.body);

    const created = await request(app)
      .post('/api/v1/seller/offers')
      .set(bearer(seller))
      .send({ componentId: offer.component.id, priceCop: 1900000, condition: 'used' });
    sellerOfferResponseSchema.parse(created.body);
    sellerOffersResponseSchema.parse(
      (await request(app).get('/api/v1/seller/offers').set(bearer(seller))).body,
    );
    sellerOfferResponseSchema.parse(
      (
        await request(app)
          .patch(`/api/v1/seller/offers/${created.body.offer.offerId}/visibility`)
          .set(bearer(seller))
          .send({ status: 'paused' })
      ).body,
    );
    analyticsSummarySchema.parse(
      (await request(app).get('/api/v1/seller/analytics/summary').set(bearer(seller))).body,
    );
  });
});
