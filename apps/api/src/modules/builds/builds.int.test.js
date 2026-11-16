// Armados guardados, enlace compartible, clonado y favoritos contra la base real.
// Las cuentas de prueba (buildtest-*), sus armados y favoritos se borran al terminar.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';

const url = process.env.DATABASE_URL;
const stamp = Date.now();
const password = 'clave-segura-123';

describe.skipIf(!url)('armados y favoritos contra PostgreSQL', () => {
  let pool;
  let db;
  let app;
  let ana; // { token }
  let beto;
  let itemsA; // armado A del seed: compatible
  let itemsB; // armado B del seed: incompatible
  let offer; // una oferta pública
  const createdIds = [];

  const bearer = (u) => ({ Authorization: `Bearer ${u.token}` });
  const track = (res) => {
    if (res.body?.build?.id) createdIds.push(res.body.build.id);
    return res;
  };

  async function itemsOf(shareCode) {
    const { rows } = await db.query(
      `SELECT bi.category::text AS category, bi.component_id AS "componentId"
         FROM builds.builds b JOIN builds.build_items bi ON bi.build_id = b.id
        WHERE b.share_code = $1 ORDER BY bi.category`,
      [shareCode],
    );
    return rows.map((r) => ({ category: r.category, componentId: r.componentId }));
  }

  async function newUser(label) {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `buildtest-${label}-${stamp}@demo.test`,
        password,
        fullName: `Comprador ${label}`,
        acceptTerms: true,
      });
    return { token: res.body.accessToken };
  }

  beforeAll(async () => {
    pool = createPool(url);
    db = createDb(pool);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
    ana = await newUser('ana');
    beto = await newUser('beto');
    itemsA = await itemsOf('Ab3dE9fG2h');
    itemsB = await itemsOf('Zx8Qw1Er5T');
    offer = (await request(app).get('/api/v1/offers?limit=1')).body.items[0];
  });

  afterAll(async () => {
    if (createdIds.length)
      await db.query('DELETE FROM builds.builds WHERE id = ANY($1::uuid[])', [createdIds]);
    await db.query("DELETE FROM identity.users WHERE email LIKE 'buildtest-%@demo.test'");
    await pool.end();
  });

  let anonymous;
  it('sin cuenta se puede guardar y compartir: queda anónimo y se abre desde otro navegador', async () => {
    const res = track(
      await request(app).post('/api/v1/builds').send({ name: 'Armado de prueba', items: itemsA }),
    );
    expect(res.status).toBe(201);
    anonymous = res.body.build;
    expect(anonymous.shareCode).toMatch(/^[A-Za-z0-9]{10}$/);
    expect(anonymous.isOwner).toBe(false);
    expect(anonymous.items).toHaveLength(8);
    expect(anonymous.estimatedWatts).toBe(300);
    expect(res.body.evaluation.results.map((r) => r.status)).toEqual(Array(8).fill('ok'));

    const { rows } = await db.query('SELECT user_id FROM builds.builds WHERE id = $1', [
      anonymous.id,
    ]);
    expect(rows[0].userId).toBeNull();

    const shared = await request(app).get(`/api/v1/builds/${anonymous.shareCode}`);
    expect(shared.status).toBe(200);
    expect(shared.body.build.name).toBe('Armado de prueba');
    expect(shared.body.evaluation.recommendedPsuW).toBe(400);
    expect(shared.body.build.items[0]).toMatchObject({
      displayName: expect.any(String),
      offerId: null,
      unitPriceCop: null,
    });
  });

  it('un armado con incompatibilidades se rechaza con el detalle; como borrador sí se guarda', async () => {
    const rejected = await request(app).post('/api/v1/builds').send({ items: itemsB });
    expect(rejected.status).toBe(422);
    expect(rejected.body.code).toBe('BUILD_INCOMPATIBLE');
    expect(rejected.body.details.incompatible.map((r) => r.code)).toEqual([
      'RC-01',
      'RC-02',
      'RC-04',
    ]);

    const draft = track(
      await request(app)
        .post('/api/v1/builds')
        .set(bearer(ana))
        .send({ name: 'Borrador', items: itemsB, draft: true }),
    );
    expect(draft.status).toBe(201);
    expect(draft.body.evaluation.summary.incompatible).toBe(3);
  });

  it('un componente inexistente o en otra categoría no se guarda', async () => {
    const ghost = await request(app)
      .post('/api/v1/builds')
      .send({ items: [{ category: 'cpu', componentId: '99999999-9999-4999-8999-999999999999' }] });
    expect(ghost.status).toBe(404);
    const wrong = await request(app)
      .post('/api/v1/builds')
      .send({
        items: [
          { category: 'gpu', componentId: itemsA.find((i) => i.category === 'cpu').componentId },
        ],
      });
    expect(wrong.status).toBe(422);
  });

  let mine;
  it('con sesión el armado queda en la cuenta, con el precio de la oferta elegida', async () => {
    const res = track(
      await request(app)
        .post('/api/v1/builds')
        .set(bearer(ana))
        .send({
          name: 'Mi primer PC',
          items: [
            {
              category: offer.component.category,
              componentId: offer.component.id,
              offerId: offer.offerId,
            },
          ],
        }),
    );
    expect(res.status).toBe(201);
    mine = res.body.build;
    expect(mine.isOwner).toBe(true);
    expect(mine.items[0]).toMatchObject({ offerId: offer.offerId, unitPriceCop: offer.priceCop });
    expect(mine.totalPriceCop).toBe(offer.priceCop);

    const list = await request(app).get('/api/v1/me/builds').set(bearer(ana));
    const found = list.body.items.find((b) => b.id === mine.id);
    expect(found).toMatchObject({
      name: 'Mi primer PC',
      totalPriceCop: offer.priceCop,
      itemCount: 1,
    });
    // la cuenta de Beto no ve los armados de Ana
    expect((await request(app).get('/api/v1/me/builds').set(bearer(beto))).body.items).toEqual([]);
  });

  it('una oferta de otro componente no sirve para el precio', async () => {
    const other = itemsA.find((i) => i.componentId !== offer.component.id);
    const res = await request(app)
      .post('/api/v1/builds')
      .set(bearer(ana))
      .send({
        items: [
          { category: other.category, componentId: other.componentId, offerId: offer.offerId },
        ],
      });
    expect(res.status).toBe(422);
  });

  it('el precio guardado no cambia aunque la oferta cambie de precio después', async () => {
    const { rows } = await db.query('SELECT price_cop FROM offers.offers WHERE id = $1', [
      offer.offerId,
    ]);
    await db.query('UPDATE offers.offers SET price_cop = price_cop + 1000 WHERE id = $1', [
      offer.offerId,
    ]);
    try {
      const again = await request(app).get(`/api/v1/builds/${mine.shareCode}`);
      expect(again.body.build.items[0].unitPriceCop).toBe(rows[0].priceCop);
    } finally {
      await db.query('UPDATE offers.offers SET price_cop = $2 WHERE id = $1', [
        offer.offerId,
        rows[0].priceCop,
      ]);
    }
  });

  it('actualizar reemplaza nombre y piezas; el armado de otra persona responde 404', async () => {
    const res = await request(app)
      .put(`/api/v1/me/builds/${mine.id}`)
      .set(bearer(ana))
      .send({ name: 'Renombrado', items: itemsA });
    expect(res.status).toBe(200);
    expect(res.body.build.name).toBe('Renombrado');
    expect(res.body.build.items).toHaveLength(8);
    expect(res.body.build.totalPriceCop).toBe(0);

    const foreign = await request(app)
      .put(`/api/v1/me/builds/${mine.id}`)
      .set(bearer(beto))
      .send({ items: itemsA });
    expect(foreign.status).toBe(404);
    expect(
      (await request(app).delete(`/api/v1/me/builds/${mine.id}`).set(bearer(beto))).status,
    ).toBe(404);
  });

  let copy;
  it('clonar un armado compartido lo copia a la cuenta de quien lo abre', async () => {
    expect((await request(app).post(`/api/v1/builds/${anonymous.shareCode}/clone`)).status).toBe(
      401,
    );
    const res = track(
      await request(app).post(`/api/v1/builds/${anonymous.shareCode}/clone`).set(bearer(beto)),
    );
    expect(res.status).toBe(201);
    copy = res.body.build;
    expect(copy.name).toBe('Armado de prueba (copia)');
    expect(copy.shareCode).not.toBe(anonymous.shareCode);
    expect(copy.isOwner).toBe(true);
    expect(copy.items.map((i) => i.componentId).sort()).toEqual(
      anonymous.items.map((i) => i.componentId).sort(),
    );

    const mineList = await request(app).get('/api/v1/me/builds').set(bearer(beto));
    expect(mineList.body.items.map((b) => b.id)).toContain(copy.id);
  });

  it('borrar un armado propio responde 204 y el enlace deja de funcionar', async () => {
    expect(
      (await request(app).delete(`/api/v1/me/builds/${copy.id}`).set(bearer(beto))).status,
    ).toBe(204);
    expect((await request(app).get(`/api/v1/builds/${copy.shareCode}`)).status).toBe(404);
    expect(
      (await request(app).delete(`/api/v1/me/builds/${copy.id}`).set(bearer(beto))).status,
    ).toBe(404);
  });

  it('un código con formato inválido es 422 y uno desconocido 404', async () => {
    expect((await request(app).get('/api/v1/builds/abc')).status).toBe(422);
    expect((await request(app).get('/api/v1/builds/Zzzzzzzzzz')).status).toBe(404);
  });

  it('favoritos: agregar es idempotente, lista con precio mínimo y se puede quitar', async () => {
    const id = offer.component.id;
    expect((await request(app).put(`/api/v1/me/wishlist/${id}`).set(bearer(ana))).status).toBe(204);
    expect((await request(app).put(`/api/v1/me/wishlist/${id}`).set(bearer(ana))).status).toBe(204);

    const list = await request(app).get('/api/v1/me/wishlist').set(bearer(ana));
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      componentId: id,
      category: offer.component.category,
      displayName: offer.component.displayName,
      offersCount: expect.any(Number),
    });
    expect(list.body.items[0].minPriceCop).toBeLessThanOrEqual(offer.priceCop);
    expect((await request(app).get('/api/v1/me/wishlist').set(bearer(beto))).body.items).toEqual(
      [],
    );

    expect((await request(app).delete(`/api/v1/me/wishlist/${id}`).set(bearer(ana))).status).toBe(
      204,
    );
    expect((await request(app).delete(`/api/v1/me/wishlist/${id}`).set(bearer(ana))).status).toBe(
      204,
    );
    expect((await request(app).get('/api/v1/me/wishlist').set(bearer(ana))).body.items).toEqual([]);
  });

  it('no se puede marcar como favorito un componente que no existe', async () => {
    const res = await request(app)
      .put('/api/v1/me/wishlist/99999999-9999-4999-8999-999999999999')
      .set(bearer(ana));
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('COMPONENT_NOT_FOUND');
    expect((await request(app).get('/api/v1/me/wishlist')).status).toBe(401);
  });
});
