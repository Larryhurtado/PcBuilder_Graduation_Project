// Favoritos simulados (GET /me/wishlist). Piden sesión, como la API, y la cuenta de comprador de
// demostración trae uno para ver el contador del perfil. Los armados están en builds.js.
import { http, HttpResponse } from 'msw';
import { demoUsers, userFromRequest } from './auth.js';
import { components } from './data.js';

const api = (path) => `*/api/v1${path}`;
const [demoBuyer] = demoUsers;

const unauthenticated = () =>
  HttpResponse.json(
    {
      code: 'UNAUTHENTICATED',
      message: 'Debes iniciar sesión para continuar.',
      details: null,
      requestId: 'mock-request',
    },
    { status: 401 },
  );

/** Favoritos por usuario; el resto de cuentas empieza vacío. */
const wishlist = {
  [demoBuyer.id]: components.slice(0, 1).map((component) => ({
    componentId: component.id,
    category: component.category,
    brand: component.brand,
    model: component.model,
    displayName: component.displayName,
    minPriceCop: 849_000,
    offersCount: 2,
    addedAt: '2026-11-11T10:00:00.000Z',
  })),
};

export const accountHandlers = [
  http.get(api('/me/wishlist'), ({ request }) => {
    const user = userFromRequest(request);
    return user ? HttpResponse.json({ items: wishlist[user.id] ?? [] }) : unauthenticated();
  }),
];
