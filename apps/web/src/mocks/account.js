// Datos de la cuenta simulados (GET /me/builds y GET /me/wishlist). Piden sesión, como la API, y la
// cuenta de comprador de demostración trae algunos datos para ver los contadores del perfil.
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

const build = (index, name, itemCount, totalPriceCop) => ({
  id: `d0000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  name,
  shareCode: `Mock${String(index).padStart(6, '0')}`,
  estimatedWatts: 350,
  totalPriceCop,
  itemCount,
  createdAt: '2026-11-10T15:00:00.000Z',
  updatedAt: '2026-11-12T09:30:00.000Z',
});

/** Armados y favoritos por usuario; el resto de cuentas empieza vacío. */
const builds = {
  [demoBuyer.id]: [build(1, 'PC para diseño', 6, 5_200_000), build(2, 'PC gamer', 8, 7_450_000)],
};
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
  http.get(api('/me/builds'), ({ request }) => {
    const user = userFromRequest(request);
    return user ? HttpResponse.json({ items: builds[user.id] ?? [] }) : unauthenticated();
  }),
  http.get(api('/me/wishlist'), ({ request }) => {
    const user = userFromRequest(request);
    return user ? HttpResponse.json({ items: wishlist[user.id] ?? [] }) : unauthenticated();
  }),
];
