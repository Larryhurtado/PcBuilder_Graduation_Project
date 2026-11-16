import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorResponseSchema } from '@hw/contracts';
import { createApp } from './app.js';
import { loadConfig } from './kernel/config.js';

const config = loadConfig({ NODE_ENV: 'test' });

describe('GET /health', () => {
  it('responde ok y devuelve la cabecera X-Request-Id', async () => {
    const res = await request(createApp({ config })).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('GET /ready', () => {
  it('sin base de datos configurada responde 503', async () => {
    const res = await request(createApp({ config })).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body.reason).toBe('database_not_configured');
  });

  it('con la base de datos accesible responde 200', async () => {
    const pool = { query: async () => ({ rows: [{ '?column?': 1 }] }) };
    const res = await request(createApp({ config, pool })).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
  });

  it('si la base de datos falla responde 503', async () => {
    const pool = {
      query: async () => {
        throw new Error('conexión rechazada');
      },
    };
    const res = await request(createApp({ config, pool })).get('/ready');
    expect(res.status).toBe(503);
    expect(res.body.reason).toBe('database_unreachable');
  });
});

describe('manejo de errores', () => {
  it('una ruta inexistente responde con el formato estándar de error', async () => {
    const res = await request(createApp({ config })).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(errorResponseSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('un JSON mal formado responde 400 VALIDATION_ERROR', async () => {
    const res = await request(createApp({ config }))
      .post('/api/v1/cualquiera')
      .set('Content-Type', 'application/json')
      .send('{"a":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
