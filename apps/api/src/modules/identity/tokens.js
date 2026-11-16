import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../../kernel/errors.js';

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

/** SHA-256 en hexadecimal: de los tokens de refresco solo se guarda este hash. */
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/** Token de refresco opaco: 32 bytes aleatorios. */
export const newRefreshToken = () => randomBytes(32).toString('base64url');

/**
 * Firma y verifica los tokens de acceso (JWT HS256, 15 minutos).
 * @param {{ secret?: string }} [options] sin secreto se genera uno aleatorio
 */
export function createTokenSigner({ secret = randomBytes(48).toString('hex') } = {}) {
  return {
    /** @param {{ id: string, role: string }} user */
    sign: (user) =>
      jwt.sign({ role: user.role }, secret, {
        algorithm: 'HS256',
        subject: user.id,
        expiresIn: ACCESS_TTL_SECONDS,
      }),

    /** @returns {{ userId: string, role: string }} @throws {AppError} TOKEN_EXPIRED o UNAUTHENTICATED */
    verify(token) {
      try {
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
        return { userId: String(payload.sub), role: String(payload.role) };
      } catch (error) {
        if (error?.name === 'TokenExpiredError') throw new AppError('TOKEN_EXPIRED');
        throw new AppError('UNAUTHENTICATED');
      }
    },
  };
}
