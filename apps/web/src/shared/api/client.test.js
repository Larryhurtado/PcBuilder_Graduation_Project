import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../mocks/node.js';
import { ApiError, apiFetch, getErrorMessage } from './client.js';

const route = (path) => `*/api/v1${path}`;

describe('apiFetch', () => {
  it('devuelve el JSON de la respuesta', async () => {
    server.use(http.get(route('/ping'), () => HttpResponse.json({ ok: true })));
    await expect(apiFetch('/ping')).resolves.toEqual({ ok: true });
  });

  it('devuelve null en una respuesta 204', async () => {
    server.use(http.post(route('/ping'), () => new HttpResponse(null, { status: 204 })));
    await expect(apiFetch('/ping', { method: 'POST', body: { a: 1 } })).resolves.toBeNull();
  });

  it('arma la consulta: omite vacíos y repite las listas', async () => {
    let received;
    server.use(
      http.get(route('/search'), ({ request }) => {
        received = new URL(request.url).search;
        return HttpResponse.json({});
      }),
    );
    await apiFetch('/search', {
      query: { q: 'ryzen', city: '', brand: null, socket: ['AM5', 'AM4'], limit: 3 },
    });
    expect(received).toBe('?q=ryzen&socket=AM5&socket=AM4&limit=3');
  });

  it('lanza ApiError con el código de negocio y un mensaje decidido por el código', async () => {
    server.use(
      http.post(route('/seller/offers'), () =>
        HttpResponse.json(
          {
            code: 'STORE_NOT_VERIFIED',
            message: 'texto del servidor',
            details: null,
            requestId: 'req-1',
          },
          { status: 403 },
        ),
      ),
    );
    const error = await apiFetch('/seller/offers', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: 'STORE_NOT_VERIFIED', requestId: 'req-1' });
    expect(error.userMessage).toBe(
      'Aún no puedes publicar productos hasta que tu negocio sea verificado.',
    );
    expect(getErrorMessage(error)).toBe(error.userMessage);
  });

  it('trata un cuerpo de error inesperado como error interno', async () => {
    server.use(
      http.get(route('/roto'), () =>
        HttpResponse.text('<html>Bad gateway</html>', { status: 502 }),
      ),
    );
    const error = await apiFetch('/roto').catch((e) => e);
    expect(error).toMatchObject({ status: 502, code: 'INTERNAL_ERROR' });
    expect(error.userMessage).toContain('error inesperado');
  });

  it('distingue un fallo de red', async () => {
    server.use(http.get(route('/sin-red'), () => HttpResponse.error()));
    const error = await apiFetch('/sin-red').catch((e) => e);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(error.userMessage).toContain('conexión');
  });
});

describe('getErrorMessage', () => {
  it('no filtra detalles de errores desconocidos', () => {
    expect(getErrorMessage(new Error('stack interno'))).toBe(
      'Ocurrió un error inesperado. Intenta de nuevo.',
    );
  });
});
