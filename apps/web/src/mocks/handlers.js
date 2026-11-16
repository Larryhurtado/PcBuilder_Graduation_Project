// Handlers de MSW: se usan tanto en el navegador (desarrollo con VITE_USE_MOCKS=true) como en las
// pruebas. Todo dato simulado debe cumplir los esquemas de @hw/contracts.
//
// Cuando un endpoint real esté listo, se borra su handler de aquí (o se apaga VITE_USE_MOCKS):
// las pantallas no cambian, porque llaman a la API siempre por /api/v1.
import { http, HttpResponse } from 'msw';
import { offers, stores } from './data.js';

// El prefijo `*` hace que los handlers funcionen igual en el navegador y en jsdom (URL absoluta).
const api = (path) => `*/api/v1${path}`;

export const handlers = [
  // HU-02: ofertas destacadas del inicio
  http.get(api('/offers/featured'), () => HttpResponse.json({ items: offers })),

  // HU-15: tiendas verificadas (solo las verificadas aparecen en lo público)
  http.get(api('/stores'), ({ request }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit')) || stores.length;
    return HttpResponse.json({
      items: stores.filter((store) => store.isVerified).slice(0, limit),
      nextCursor: null,
    });
  }),

  // HU-08: vistas y clics a WhatsApp
  http.post(api('/events'), () => new HttpResponse(null, { status: 204 })),
];
