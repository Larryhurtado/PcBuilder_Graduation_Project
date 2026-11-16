// Flujo completo del vendedor contra la base real: cascada, fotos, publicar, editar, pausar,
// métricas y baja. Las cuentas de prueba (offertest-*), sus ofertas y las fotos se borran al terminar.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApproveStoreSql } from '../../../../../tools/db-lib.mjs';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';

const url = process.env.DATABASE_URL;
const stamp = Date.now();
const password = 'clave-segura-123';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('datos-de-prueba'),
]);

describe.skipIf(!url)('inventario del vendedor contra PostgreSQL', () => {
  let pool;
  let db;
  let app;
  let storageDir;
  let A; // vendedor verificado
  let B; // vendedor sin verificar
  let componentId;

  const bearer = (u) => ({ Authorization: `Bearer ${u.token}` });

  async function newSeller(label, { approve }) {
    const email = `offertest-${label}-${stamp}@demo.test`;
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password, fullName: `Vendedor ${label}`, acceptTerms: true });
    const conv = await request(app)
      .post('/api/v1/seller/convert')
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ legalName: `Prueba ${label} SAS`, tradeName: `Prueba ${label}` });
    if (approve) await pool.query(buildApproveStoreSql(`'${email}'`));
    return { email, token: conv.body.accessToken, storeId: conv.body.store.id };
  }

  beforeAll(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'hw-int-storage-'));
    pool = createPool(url);
    db = createDb(pool);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test', STORAGE_DIR: storageDir }), pool });
    A = await newSeller('a', { approve: true });
    B = await newSeller('b', { approve: false });
  });

  afterAll(async () => {
    const owners = "(SELECT id FROM identity.users WHERE email LIKE 'offertest-%@demo.test')";
    await db.query(
      `DELETE FROM offers.offers WHERE store_id IN (SELECT id FROM stores.stores WHERE owner_user_id IN ${owners})`,
    );
    await db.query(`DELETE FROM stores.stores WHERE owner_user_id IN ${owners}`);
    await db.query("DELETE FROM identity.users WHERE email LIKE 'offertest-%@demo.test'");
    await pool.end();
    await rm(storageDir, { recursive: true, force: true });
  });

  it('la cascada del vendedor: marcas de la categoría y modelos de la marca', async () => {
    const brands = await request(app).get('/api/v1/catalog/brands?category=gpu').set(bearer(A));
    expect(brands.status).toBe(200);
    expect(brands.body.items.length).toBeGreaterThan(0);
    expect(brands.body.items[0]).toEqual({ id: expect.any(Number), name: expect.any(String) });

    const models = await request(app)
      .get(`/api/v1/catalog/models?category=gpu&brandId=${brands.body.items[0].id}`)
      .set(bearer(A));
    expect(models.status).toBe(200);
    expect(models.body.items[0]).toEqual({
      componentId: expect.any(String),
      model: expect.any(String),
      displayName: expect.any(String),
    });
    componentId = models.body.items[0].componentId;
    // sin sesión no hay cascada
    expect((await request(app).get('/api/v1/catalog/brands?category=gpu')).status).toBe(401);
  });

  it('un vendedor sin verificar no puede publicar ni subir fotos (403), pero sí ver su inventario vacío', async () => {
    const create = await request(app)
      .post('/api/v1/seller/offers')
      .set(bearer(B))
      .send({ componentId, priceCop: 1000000, condition: 'new' });
    expect(create.status).toBe(403);
    expect(create.body.code).toBe('STORE_NOT_VERIFIED');
    const presign = await request(app)
      .post('/api/v1/seller/offers/images/presign')
      .set(bearer(B))
      .send({ fileName: 'a.png', mimeType: 'image/png', sizeBytes: 100 });
    expect(presign.status).toBe(403);
    const list = await request(app).get('/api/v1/seller/offers').set(bearer(B));
    expect(list.body).toEqual({ items: [] });
  });

  let imageKey;
  it('sube una foto en dos pasos y se sirve como archivo estático', async () => {
    const presign = await request(app)
      .post('/api/v1/seller/offers/images/presign')
      .set(bearer(A))
      .send({ fileName: 'tarjeta.png', mimeType: 'image/png', sizeBytes: PNG.length });
    expect(presign.status).toBe(200);
    imageKey = presign.body.storageKey;
    expect(imageKey).toContain(`offers/${A.storeId}/`);

    const put = await request(app)
      .put(presign.body.uploadUrl)
      .set(bearer(A))
      .set('Content-Type', 'image/png')
      .send(PNG);
    expect(put.status).toBe(204);

    const file = await request(app).get(`/storage/${imageKey}`);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toMatch(/image\/png/);
    expect(Buffer.compare(file.body, PNG)).toBe(0);
  });

  it('rechaza archivos que no son imágenes de verdad o pesan más de 5 MB', async () => {
    const name = '11111111-1111-4111-8111-111111111111.png';
    const fake = await request(app)
      .put(`/api/v1/seller/offers/images/${name}`)
      .set(bearer(A))
      .set('Content-Type', 'image/png')
      .send(Buffer.from('esto es un texto, no un PNG'));
    expect(fake.status).toBe(422);
    expect(fake.body.code).toBe('FILE_REJECTED');

    const big = await request(app)
      .put(`/api/v1/seller/offers/images/${name}`)
      .set(bearer(A))
      .set('Content-Type', 'image/png')
      .send(Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]));
    expect(big.status).toBe(422);
    expect((await request(app).get(`/storage/offers/${A.storeId}/${name}`)).status).toBe(404);
  });

  let offer;
  it('publica una oferta con foto: aparece en el inventario y en el catálogo público', async () => {
    const res = await request(app)
      .post('/api/v1/seller/offers')
      .set(bearer(A))
      .send({
        componentId,
        priceCop: 1800000,
        condition: 'new',
        warrantyMonths: 12,
        description: 'Sellada',
        imageKeys: [imageKey],
      });
    expect(res.status).toBe(201);
    offer = res.body.offer;
    expect(offer).toMatchObject({
      status: 'active',
      priceCop: 1800000,
      condition: 'new',
      warrantyMonths: 12,
      description: 'Sellada',
      component: { id: componentId, category: 'gpu' },
      images: [{ key: imageKey, url: `/storage/${imageKey}`, position: 1 }],
    });

    const mine = await request(app).get('/api/v1/seller/offers').set(bearer(A));
    expect(mine.body.items.map((o) => o.offerId)).toContain(offer.offerId);

    const pub = await request(app).get(`/api/v1/offers/${offer.offerId}`);
    expect(pub.status).toBe(200);
    expect(pub.body.priceCop).toBe(1800000);
    expect(pub.body.images[0].url).toBe(`/storage/${imageKey}`);
  });

  it('publicar el mismo producto en el mismo estado da 409 OFFER_DUPLICATE; usado sí se puede', async () => {
    const dup = await request(app)
      .post('/api/v1/seller/offers')
      .set(bearer(A))
      .send({ componentId, priceCop: 1700000, condition: 'new' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('OFFER_DUPLICATE');
    const used = await request(app)
      .post('/api/v1/seller/offers')
      .set(bearer(A))
      .send({ componentId, priceCop: 1200000, condition: 'used' });
    expect(used.status).toBe(201);
  });

  it('un producto inexistente da 404 COMPONENT_NOT_FOUND y una foto ajena 422', async () => {
    const ghost = await request(app)
      .post('/api/v1/seller/offers')
      .set(bearer(A))
      .send({ componentId: '99999999-9999-4999-8999-999999999999', priceCop: 1, condition: 'new' });
    expect(ghost.status).toBe(404);
    expect(ghost.body.code).toBe('COMPONENT_NOT_FOUND');
    const foreign = await request(app)
      .patch(`/api/v1/seller/offers/${offer.offerId}`)
      .set(bearer(A))
      .send({ imageKeys: [`offers/${B.storeId}/11111111-1111-4111-8111-111111111111.png`] });
    expect(foreign.status).toBe(422);
  });

  it('editar el precio actualiza la oferta y deja el cambio en el historial de precios', async () => {
    const res = await request(app)
      .patch(`/api/v1/seller/offers/${offer.offerId}`)
      .set(bearer(A))
      .send({ priceCop: 1750000, description: 'Sellada, con factura' });
    expect(res.status).toBe(200);
    expect(res.body.offer).toMatchObject({
      priceCop: 1750000,
      description: 'Sellada, con factura',
    });
    const { rows } = await db.query(
      'SELECT count(*)::int AS n FROM offers.offer_price_history WHERE offer_id = $1',
      [offer.offerId],
    );
    expect(rows[0].n).toBe(2);
  });

  it('pausar la oferta la saca del catálogo público y activarla la devuelve', async () => {
    const paused = await request(app)
      .patch(`/api/v1/seller/offers/${offer.offerId}/visibility`)
      .set(bearer(A))
      .send({ status: 'paused' });
    expect(paused.body.offer.status).toBe('paused');
    expect((await request(app).get(`/api/v1/offers/${offer.offerId}`)).status).toBe(404);
    const inventory = await request(app).get('/api/v1/seller/offers').set(bearer(A));
    expect(inventory.body.items.find((o) => o.offerId === offer.offerId).status).toBe('paused');

    const active = await request(app)
      .patch(`/api/v1/seller/offers/${offer.offerId}/visibility`)
      .set(bearer(A))
      .send({ status: 'active' });
    expect(active.body.offer.status).toBe('active');
    expect((await request(app).get(`/api/v1/offers/${offer.offerId}`)).status).toBe(200);
  });

  it('otro vendedor no puede ver, editar ni borrar ofertas ajenas (404)', async () => {
    const edit = await request(app)
      .patch(`/api/v1/seller/offers/${offer.offerId}`)
      .set(bearer(B))
      .send({ priceCop: 1 });
    expect(edit.status).toBe(403); // B no está verificado: ni siquiera llega a buscar la oferta
    const del = await request(app).delete(`/api/v1/seller/offers/${offer.offerId}`).set(bearer(B));
    expect(del.status).toBe(404);
    const stillThere = await request(app).get(`/api/v1/offers/${offer.offerId}`);
    expect(stillThere.body.priceCop).toBe(1750000);
  });

  it('el panel cuenta vistas, clics y ofertas por estado', async () => {
    const view = await request(app)
      .post('/api/v1/events')
      .set('User-Agent', 'int-test')
      .send({ offerId: offer.offerId, type: 'view' });
    const click = await request(app)
      .post('/api/v1/events')
      .set('User-Agent', 'int-test')
      .send({ offerId: offer.offerId, type: 'whatsapp_click' });
    expect([view.status, click.status]).toEqual([204, 204]);

    const res = await request(app).get('/api/v1/seller/analytics/summary').set(bearer(A));
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({
      views: 1,
      whatsappClicks: 1,
      activeOffers: 2,
      pausedOffers: 0,
    });
    expect(res.body.daily).toHaveLength(7);
    expect(res.body.daily.at(-1)).toMatchObject({ views: 1, whatsappClicks: 1 });
    expect(res.body.daily.slice(0, -1).every((d) => d.views === 0 && d.whatsappClicks === 0)).toBe(
      true,
    );

    // las métricas son del comercio: el otro vendedor ve ceros
    const other = await request(app).get('/api/v1/seller/analytics/summary').set(bearer(B));
    expect(other.body.totals).toEqual({
      views: 0,
      whatsappClicks: 0,
      activeOffers: 0,
      pausedOffers: 0,
    });
    expect(
      (
        await request(app)
          .get('/api/v1/seller/analytics/summary?from=2026-01-01&to=2026-11-16')
          .set(bearer(A))
      ).status,
    ).toBe(422);
  });

  it('la baja es lógica: la oferta desaparece de todo y la combinación queda libre para publicar de nuevo', async () => {
    const del = await request(app).delete(`/api/v1/seller/offers/${offer.offerId}`).set(bearer(A));
    expect(del.status).toBe(204);
    expect((await request(app).get(`/api/v1/offers/${offer.offerId}`)).status).toBe(404);
    const inventory = await request(app).get('/api/v1/seller/offers').set(bearer(A));
    expect(inventory.body.items.map((o) => o.offerId)).not.toContain(offer.offerId);

    const { rows } = await db.query('SELECT deleted_at FROM offers.offers WHERE id = $1', [
      offer.offerId,
    ]);
    expect(rows[0].deletedAt).toBeInstanceOf(Date); // sigue en la base

    const again = await request(app)
      .post('/api/v1/seller/offers')
      .set(bearer(A))
      .send({ componentId, priceCop: 1650000, condition: 'new' });
    expect(again.status).toBe(201);
    expect(
      (await request(app).delete(`/api/v1/seller/offers/${offer.offerId}`).set(bearer(A))).status,
    ).toBe(404);
  });
});
