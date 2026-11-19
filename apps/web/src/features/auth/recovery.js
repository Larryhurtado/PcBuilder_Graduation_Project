import { apiFetch } from '../../shared/api/client.js';

/** Pide el enlace de recuperación (POST /auth/forgot). Responde igual exista o no el correo. */
export async function requestPasswordReset(email) {
  await apiFetch('/auth/forgot', { method: 'POST', body: { email } });
}

/** Cambia la contraseña con el token del enlace del correo (POST /auth/reset). */
export async function resetPassword({ token, password }) {
  await apiFetch('/auth/reset', { method: 'POST', body: { token, password } });
}
