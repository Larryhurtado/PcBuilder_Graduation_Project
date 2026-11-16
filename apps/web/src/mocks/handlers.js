// Handlers de MSW: se usan tanto en el navegador (desarrollo con VITE_USE_MOCKS=true) como en las
// pruebas. Todo dato simulado debe cumplir los esquemas de @hw/contracts.
// Ejemplo:
//   import { http, HttpResponse } from 'msw';
//   http.get('/api/v1/offers', () => HttpResponse.json({ items: [], nextCursor: null }))
export const handlers = [];
