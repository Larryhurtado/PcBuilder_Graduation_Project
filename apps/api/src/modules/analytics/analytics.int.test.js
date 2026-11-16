// POST /events contra la base real. Los eventos que crean estas pruebas se borran al terminar.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('eventos de analítica contra PostgreSQL', () => {
  let pool;
  let db;
  let app;
  let lastIdBefore;
  let offer; // una oferta pública
  let pausedOfferId;

  beforeAll(async () => {
    pool = createPool(url);
    db = createDb(pool);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
    const { rows } = await db.query(
      'SELECT COALESCE(max(id), 0) AS last FROM analytics.offer_events',
    );
    lastIdBefore = rows[0].last;
    offer = (await request(app).get('/api/v1/offers?limit=1')).body.items[0];
    const paused = await db.query("SELECT id FROM offers.offers WHERE status = 'paused' LIMIT 1");
    pausedOfferId = paused.rows[0].id;
  });

  afterAll(async () => {
    await db.query('DELETE FROM analytics.offer_events WHERE id > $1', [lastIdBefore]);
    await pool.end();
  });

  const post = (body, userAgent = 'vitest-a') =>
    request(app).post('/api/v1/events').set('User-Agent', userAgent).send(body);
  const newEvents = () =>
    db.query(
      `SELECT offer_id, store_id, event_type::text AS event_type, session_hash, tableoid::regclass::text AS partition
         FROM analytics.offer_events WHERE id > $1 ORDER BY id`,
      [lastIdBefore],
    );

  it('registra un clic a WhatsApp con la tienda de la oferta y un hash en vez de la IP', async () => {
    const res = await post({ offerId: offer.offerId, type: 'whatsapp_click' });
    expect(res.status).toBe(204);

    const { rows } = await newEvents();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      offerId: offer.offerId,
      storeId: offer.store.id,
      eventType: 'whatsapp_click',
    });
    expect(rows[0].sessionHash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].sessionHash).not.toContain('127.0.0.1');
  });

  it('el mismo clic repetido por la misma sesión se descarta en silencio (también 204)', async () => {
    const again = await post({ offerId: offer.offerId, type: 'whatsapp_click' });
    expect(again.status).toBe(204);
    expect((await newEvents()).rows).toHaveLength(1);
  });

  it('otra sesión (otro agente de usuario) sí cuenta, y una vista es un evento distinto', async () => {
    await post({ offerId: offer.offerId, type: 'whatsapp_click' }, 'vitest-b');
    await post({ offerId: offer.offerId, type: 'view' }, 'vitest-a');
    const { rows } = await newEvents();
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.sessionHash)).size).toBe(2);
    expect(rows.map((r) => r.eventType).sort()).toEqual([
      'view',
      'whatsapp_click',
      'whatsapp_click',
    ]);
  });

  it('una oferta pausada o inexistente responde 404 y no guarda nada', async () => {
    const before = (await newEvents()).rows.length;
    expect((await post({ offerId: pausedOfferId, type: 'view' })).status).toBe(404);
    expect(
      (await post({ offerId: '99999999-9999-4999-8999-999999999999', type: 'view' })).status,
    ).toBe(404);
    expect((await newEvents()).rows).toHaveLength(before);
  });

  it('un cuerpo inválido responde 422 y sendBeacon con texto funciona', async () => {
    expect((await post({ offerId: 'abc', type: 'view' })).status).toBe(422);

    const before = (await newEvents()).rows.length;
    const beacon = await request(app)
      .post('/api/v1/events')
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .set('User-Agent', 'vitest-beacon')
      .send(JSON.stringify({ offerId: offer.offerId, type: 'view' }));
    expect(beacon.status).toBe(204);
    expect((await newEvents()).rows).toHaveLength(before + 1);
  });

  it('los eventos caen en la partición del mes actual (no en la partición por defecto)', async () => {
    const { rows } = await newEvents();
    const month = new Date().toISOString().slice(0, 7).replace('-', '_');
    expect(rows.every((r) => r.partition === `analytics.offer_events_${month}`)).toBe(true);
  });

  it('ensurePartitions es idempotente y crea el mes actual y el siguiente', async () => {
    await app.locals.analytics.ensurePartitions();
    await app.locals.analytics.ensurePartitions();
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const name = (d) => `analytics.offer_events_${d.toISOString().slice(0, 7).replace('-', '_')}`;
    for (const d of [now, next]) {
      const { rows } = await db.query('SELECT to_regclass($1) AS t', [name(d)]);
      expect(rows[0].t).not.toBeNull();
    }
  });
});
