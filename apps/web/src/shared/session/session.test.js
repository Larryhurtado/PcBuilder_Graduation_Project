import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { server } from '../../mocks/node.js';
import { apiFetch } from '../api/client.js';
import { bootstrapSession, login, logout } from './actions.js';
import { refreshSession } from './refresh.js';
import { getAccessToken, useSessionStore } from './store.js';

const state = () => useSessionStore.getState();
const route = (path) => `*/api/v1${path}`;
const [buyer] = demoUsers;

describe('sesión: arranque', () => {
  it('empieza cargando y, sin cookie de refresco, queda como visitante', async () => {
    expect(state().status).toBe('loading');
    await expect(bootstrapSession()).resolves.toBe(false);
    expect(state()).toMatchObject({ status: 'guest', user: null, accessToken: null });
  });

  it('con cookie de refresco restaura la sesión y guarda el token solo en memoria', async () => {
    signInMock(buyer);
    await expect(bootstrapSession()).resolves.toBe(true);
    expect(state().status).toBe('authenticated');
    expect(state().user).toEqual({
      id: buyer.id,
      email: buyer.email,
      fullName: buyer.fullName,
      role: 'buyer',
    });
    expect(getAccessToken()).toMatch(/^mock-token-/);
    expect(JSON.stringify({ ...localStorage })).not.toContain('mock-token');
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('mock-token');
  });

  it('el arranque se hace una sola vez', async () => {
    let calls = 0;
    server.use(
      http.post(route('/auth/refresh'), () => {
        calls += 1;
        return HttpResponse.json({}, { status: 401 });
      }),
    );
    await Promise.all([bootstrapSession(), bootstrapSession()]);
    await bootstrapSession();
    expect(calls).toBe(1);
  });

  it('sin conexión se trata como visitante', async () => {
    server.use(http.post(route('/auth/refresh'), () => HttpResponse.error()));
    await expect(bootstrapSession()).resolves.toBe(false);
    expect(state().status).toBe('guest');
  });

  it('una respuesta de refresco con forma inválida no abre sesión', async () => {
    server.use(http.post(route('/auth/refresh'), () => HttpResponse.json({ accessToken: 1 })));
    await expect(refreshSession()).resolves.toBe(false);
    expect(state().status).toBe('guest');
  });

  it('dos refrescos a la vez comparten una sola llamada', async () => {
    signInMock(buyer);
    let calls = 0;
    server.use(
      http.post(route('/auth/refresh'), () => {
        calls += 1;
        return HttpResponse.json({
          accessToken: 'nuevo',
          expiresIn: 900,
          user: { id: buyer.id, email: buyer.email, fullName: buyer.fullName, role: 'buyer' },
        });
      }),
    );
    await Promise.all([refreshSession(), refreshSession()]);
    expect(calls).toBe(1);
  });
});

describe('sesión: ingresar y salir', () => {
  it('login guarda el usuario y el token', async () => {
    const user = await login({ email: buyer.email, password: buyer.password });
    expect(user.email).toBe(buyer.email);
    expect(state().status).toBe('authenticated');
    expect(getAccessToken()).toBeTruthy();
  });

  it('login con datos incorrectos lanza INVALID_CREDENTIALS y no abre sesión', async () => {
    await expect(login({ email: buyer.email, password: 'mala' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
    expect(state().user).toBeNull();
  });

  it('logout borra la sesión local y la cookie', async () => {
    await login({ email: buyer.email, password: buyer.password });
    await logout();
    expect(state()).toMatchObject({ status: 'guest', user: null, accessToken: null });
    await expect(refreshSession()).resolves.toBe(false);
  });

  it('logout cierra la sesión local aunque el servidor no responda', async () => {
    await login({ email: buyer.email, password: buyer.password });
    server.use(http.post(route('/auth/logout'), () => HttpResponse.error()));
    await expect(logout()).resolves.toBeUndefined();
    expect(state().status).toBe('guest');
  });
});

describe('apiFetch con sesión', () => {
  it('envía el token de acceso como Bearer', async () => {
    await login({ email: buyer.email, password: buyer.password });
    const { user } = await apiFetch('/me');
    expect(user.email).toBe(buyer.email);
  });

  it('sin sesión no envía Authorization', async () => {
    let header = 'x';
    server.use(
      http.get(route('/ping'), ({ request }) => {
        header = request.headers.get('Authorization');
        return HttpResponse.json({});
      }),
    );
    await apiFetch('/ping');
    expect(header).toBeNull();
  });

  it('ante TOKEN_EXPIRED renueva la sesión una vez y repite la petición', async () => {
    signInMock(buyer);
    await bootstrapSession();
    let attempts = 0;
    server.use(
      http.get(route('/me/algo'), () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { code: 'TOKEN_EXPIRED', message: 'x', details: null, requestId: 'r' },
              { status: 401 },
            )
          : HttpResponse.json({ ok: true });
      }),
    );
    await expect(apiFetch('/me/algo')).resolves.toEqual({ ok: true });
    expect(attempts).toBe(2);
  });

  it('si el refresco falla, lanza el error y deja la sesión cerrada', async () => {
    signInMock(buyer);
    await bootstrapSession();
    // La cookie de refresco ya no sirve
    server.use(
      http.post(route('/auth/refresh'), () =>
        HttpResponse.json(
          { code: 'UNAUTHENTICATED', message: 'x', details: null, requestId: 'r' },
          { status: 401 },
        ),
      ),
      http.get(route('/me/algo'), () =>
        HttpResponse.json(
          { code: 'TOKEN_EXPIRED', message: 'x', details: null, requestId: 'r' },
          { status: 401 },
        ),
      ),
    );
    await expect(apiFetch('/me/algo')).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
    expect(state().status).toBe('guest');
  });

  it('no reintenta las llamadas a /auth/*', async () => {
    let calls = 0;
    server.use(
      http.post(route('/auth/login'), () => {
        calls += 1;
        return HttpResponse.json(
          { code: 'TOKEN_EXPIRED', message: 'x', details: null, requestId: 'r' },
          { status: 401 },
        );
      }),
    );
    await expect(apiFetch('/auth/login', { method: 'POST', body: {} })).rejects.toBeDefined();
    expect(calls).toBe(1);
  });
});
