// Autenticación simulada (POST /auth/login, /auth/refresh, /auth/logout y GET /me). Imita la cookie
// de refresco con una variable: mientras haya "sesión", /auth/refresh devuelve un token nuevo.
// Las cuentas de abajo son SOLO de demostración para el desarrollo con VITE_USE_MOCKS=true.
import { forgotBodySchema, registerBodySchema, resetBodySchema } from '@hw/contracts';
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

/** Cuentas existentes: las de demostración más las que se creen con el registro simulado. */
let users = [...demoUsers];

/** Tokens de recuperación de contraseña emitidos (token → correo); de un solo uso. */
let resetTokens = new Map();

/**
 * Solo desarrollo: el token de recuperación más reciente de un correo (en producción llega por
 * correo). Lo usa el recuadro de la pantalla de recuperación para poder probar el flujo sin correo.
 */
export function getMockResetToken(email) {
  return [...resetTokens.entries()].reverse().find(([, owner]) => owner === email)?.[0] ?? null;
}

/** Usuario con "cookie de refresco" vigente (null = visitante). */
let current = null;

/** Usuario dueño del token Bearer de la petición (undefined si no hay sesión). */
export function userFromRequest(request) {
  return users.find((item) => request.headers.get('Authorization') === `Bearer ${tokenFor(item)}`);
}

/** Cambia datos de una cuenta simulada (por ejemplo su rol al convertirse en vendedora). */
export function updateMockUser(id, patch) {
  users = users.map((item) => (item.id === id ? { ...item, ...patch } : item));
  if (current?.id === id) current = users.find((item) => item.id === id);
  return users.find((item) => item.id === id);
}

/** Respuesta de autenticación (token, vigencia y usuario) de una cuenta simulada. */
export function authResponseFor(user) {
  return authResponse(user);
}

/** Quita la sesión simulada y las cuentas creadas durante la prueba. */
export function resetMockAuth() {
  current = null;
  users = [...demoUsers];
  resetTokens = new Map();
}

/** Deja una sesión simulada abierta, como si ya hubiera una cookie de refresco (para pruebas). */
export function signInMock(user = demoUsers[0]) {
  current = user;
  return authResponse(user);
}

export const authHandlers = [
  // Registro: valida con el contrato, rechaza correos repetidos y deja la sesión abierta
  http.post(api('/auth/register'), async ({ request }) => {
    const parsed = registerBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
    const { email, password, fullName } = parsed.data;
    if (users.some((item) => item.email === email)) {
      return error(409, 'EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.');
    }
    const user = {
      id: `b0000000-0000-4000-8000-${String(users.length + 1).padStart(12, '0')}`,
      email,
      password,
      fullName,
      role: 'buyer',
    };
    users = [...users, user];
    current = user;
    return HttpResponse.json(authResponse(user), { status: 201 });
  }),

  http.post(api('/auth/login'), async ({ request }) => {
    const body = await request.json().catch(() => null);
    const user = users.find(
      (item) => item.email === body?.email && item.password === body?.password,
    );
    if (!user) return error(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    current = user;
    return HttpResponse.json(authResponse(user));
  }),

  // Recuperar contraseña: responde igual exista o no la cuenta (no revela qué correos hay)
  http.post(api('/auth/forgot'), async ({ request }) => {
    const parsed = forgotBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
    const { email } = parsed.data;
    if (users.some((item) => item.email === email)) {
      // Un enlace nuevo deja sin efecto los anteriores del mismo correo
      resetTokens = new Map([...resetTokens].filter(([, owner]) => owner !== email));
      resetTokens.set(`mock-reset-${crypto.randomUUID()}`, email);
    }
    return HttpResponse.json({});
  }),

  http.post(api('/auth/reset'), async ({ request }) => {
    const parsed = resetBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
    const { token, password } = parsed.data;
    const email = resetTokens.get(token);
    if (!email) {
      return error(400, 'INVALID_RESET_TOKEN', 'El enlace de recuperación no es válido o venció.');
    }
    resetTokens.delete(token);
    users = users.map((item) => (item.email === email ? { ...item, password } : item));
    return new HttpResponse(null, { status: 204 });
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
    const user = userFromRequest(request);
    return user
      ? HttpResponse.json({ user: publicUser(user) })
      : error(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');
  }),
];
