import { z } from 'zod';

/** Versión vigente de la política de tratamiento de datos que acepta quien se registra (Ley 1581/2012). */
export const PRIVACY_POLICY_VERSION = '2026-01';

export const userRoleValues = ['buyer', 'seller', 'admin'];

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Correo electrónico no válido');

/** Mínimo 8 caracteres, con al menos una letra y un número. */
const password = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/[0-9]/, 'Debe incluir al menos un número');

export const registerBodySchema = z.strictObject({
  email,
  password,
  fullName: z.string().trim().min(2).max(120),
  /** El consentimiento es obligatorio y explícito. */
  acceptTerms: z.literal(true, { error: 'Debes aceptar el tratamiento de datos' }),
});

export const loginBodySchema = z.strictObject({
  email,
  // En el login no se vuelven a exigir las reglas de formato de la contraseña
  password: z.string().min(1).max(72),
});

/**
 * Recuperar contraseña, paso 1: solo el correo. La API responde 200 igual exista o no la cuenta,
 * para no revelar qué correos están registrados.
 */
export const forgotBodySchema = z.strictObject({ email });

/**
 * Recuperar contraseña, paso 2: el token del enlace del correo (un solo uso) y la contraseña nueva,
 * con las mismas reglas del registro.
 */
export const resetBodySchema = z.strictObject({
  token: z.string().trim().min(1).max(200),
  password,
});

export const userSchema = z.object({
  id: z.guid(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(userRoleValues),
});

/** Respuesta de register, login y refresh. El token de refresco viaja solo en la cookie. */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  /** Segundos de vigencia del token de acceso. */
  expiresIn: z.number().int().positive(),
  user: userSchema,
});

export const meResponseSchema = z.object({ user: userSchema });
