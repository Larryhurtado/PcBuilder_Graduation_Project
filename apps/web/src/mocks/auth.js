// Autenticación simulada (POST /auth/login, /auth/refresh, /auth/logout y GET /me). Imita la cookie
// de refresco con una variable: mientras haya "sesión", /auth/refresh devuelve un token nuevo.
// Las cuentas de abajo son SOLO de demostración para el desarrollo con VITE_USE_MOCKS=true.
import { http, HttpResponse } from 'msw';

export const demoUsers = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    email: 'comprador@demo.pcbuilder.co',
    password: 'Demo12345',
    fullName: 'Camila Comprador',
    role: 'buyer',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000002',
    email: 'vendedor@demo.pcbuilder.co',
    password: 'Demo12345',
    fullName: 'Valentina Vendedora',
    role: 'seller',
  },
];

const api = (path) => `*/api/v1${path}`;

const publicUser = ({ id, email, fullName, role }) => ({ id, email, fullName, role });
const tokenFor = (user) => `mock-token-${user.id}`;
const authResponse = (user) => ({
  accessToken: tokenFor(user),
  expiresIn: 900,
  user: publicUser(user),
});

const error = (status, code, message) =>
  HttpResponse.json({ code, message, details: null, requestId: 'mock-request' }, { status });

/** Usuario con "cookie de refresco" vigente (null = visitante). */
let current = null;

/** Quita la sesión simulada (para pruebas). */
export function resetMockAuth() {
  current = null;
}

/** Deja una sesión simulada abierta, como si ya hubiera una cookie de refresco (para pruebas). */
export function signInMock(user = demoUsers[0]) {
  current = user;
  return authResponse(user);
}

export const authHandlers = [
  http.post(api('/auth/login'), async ({ request }) => {
    const body = await request.json().catch(() => null);
    const user = demoUsers.find(
      (item) => item.email === body?.email && item.password === body?.password,
    );
    if (!user) return error(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    current = user;
    return HttpResponse.json(authResponse(user));
  }),

  http.post(api('/auth/refresh'), () =>
    current
      ? HttpResponse.json(authResponse(current))
      : error(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.'),
  ),

  http.post(api('/auth/logout'), () => {
    current = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/me'), ({ request }) => {
    const user = demoUsers.find(
      (item) => request.headers.get('Authorization') === `Bearer ${tokenFor(item)}`,
    );
    return user
      ? HttpResponse.json({ user: publicUser(user) })
      : error(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');
  }),
];
