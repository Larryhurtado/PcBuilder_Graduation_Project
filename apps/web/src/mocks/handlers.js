// Handlers de MSW: se usan tanto en el navegador (desarrollo con VITE_USE_MOCKS=true) como en las
// pruebas. Todo dato simulado debe cumplir los esquemas de @hw/contracts.
//
// Cuando un endpoint real esté listo, se borra su handler de aquí (o se apaga VITE_USE_MOCKS):
// las pantallas no cambian, porque llaman a la API siempre por /api/v1.
import { http, HttpResponse } from 'msw';
import { featuredOffers, searchOffers } from './catalog.js';
import { accountHandlers } from './account.js';
import { authHandlers } from './auth.js';
import { components, publicStores } from './data.js';

// El prefijo `*` hace que los handlers funcionen igual en el navegador y en jsdom (URL absoluta).
const api = (path) => `*/api/v1${path}`;

export const handlers = [
  // Sesión: login, refresco, cierre y usuario actual
  ...authHandlers,
  // Cuenta: armados guardados y favoritos
  ...accountHandlers,

  // Catálogo y ofertas con filtros, orden, paginación y filtros técnicos del motor (HU-02, 06, 09)
  http.get(api('/offers/featured'), ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit')) || 8;
    return HttpResponse.json(featuredOffers(limit));
  }),
  http.get(api('/offers'), ({ request }) =>
    HttpResponse.json(searchOffers(new URL(request.url).searchParams)),
  ),

  // HU-08: ficha del componente con sus especificaciones (GET /components/{id})
  http.get(api('/components/:id'), ({ params }) => {
    const component = components.find((item) => item.id === params.id);
    return component
      ? HttpResponse.json(component)
      : HttpResponse.json(
          {
            code: 'COMPONENT_NOT_FOUND',
            message: 'Componente no encontrado.',
            details: { componentId: params.id },
            requestId: 'mock-request',
          },
          { status: 404 },
        );
  }),

  // HU-15: comercios verificados (GET /stores), con q, city y limit como en la API
  http.get(api('/stores'), ({ request }) => {
    const params = new URL(request.url).searchParams;
    const q = params.get('q')?.toLowerCase();
    const city = params.get('city')?.toLowerCase();
    const limit = Number(params.get('limit')) || 12;
    const items = publicStores
      .filter((store) => !city || store.city?.toLowerCase() === city)
      .filter(
        (store) =>
          !q || `${store.name} ${store.description ?? ''} ${store.city}`.toLowerCase().includes(q),
      )
      .slice(0, limit);
    return HttpResponse.json({ items });
  }),

  // HU-08: vistas y clics a WhatsApp
  http.post(api('/events'), () => new HttpResponse(null, { status: 204 })),
];
