import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  createTokenSigner,
  hashToken,
  newRefreshToken,
} from './tokens.js';

const USER = { id: '6b03b443-7b22-491c-b301-7e2a285359df', role: 'seller' };
const SECRET = 'x'.repeat(40);

describe('tokens de acceso', () => {
  it('firma y verifica: devuelve el usuario y el rol', () => {
    const signer = createTokenSigner({ secret: SECRET });
    expect(signer.verify(signer.sign(USER))).toEqual({ userId: USER.id, role: 'seller' });
  });

  it('dura 15 minutos y el de refresco 7 días', () => {
    const token = createTokenSigner({ secret: SECRET }).sign(USER);
    const { iat, exp } = jwt.decode(token);
    expect(exp - iat).toBe(ACCESS_TTL_SECONDS);
    expect(ACCESS_TTL_SECONDS).toBe(900);
    expect(REFRESH_TTL_SECONDS).toBe(7 * 86400);
  });

  it('un token vencido lanza TOKEN_EXPIRED (401)', () => {
    const expired = jwt.sign({ role: 'buyer' }, SECRET, { subject: USER.id, expiresIn: -10 });
    expect(() => createTokenSigner({ secret: SECRET }).verify(expired)).toThrowError(
      expect.objectContaining({ code: 'TOKEN_EXPIRED', status: 401 }),
    );
  });

  it.each([
    ['basura', 'no-es-un-token'],
    [
      'firmado con otro secreto',
      jwt.sign({ role: 'admin' }, 'otro-secreto-distinto-de-40-caracteres', { subject: 'x' }),
    ],
    [
      'sin firma (alg none)',
      `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"sub":"x","role":"admin"}').toString('base64url')}.`,
    ],
  ])('rechaza con UNAUTHENTICATED: %s', (_name, token) => {
    expect(() => createTokenSigner({ secret: SECRET }).verify(token)).toThrowError(
      expect.objectContaining({ code: 'UNAUTHENTICATED', status: 401 }),
    );
  });

  it('sin secreto genera uno aleatorio: un firmante no valida los tokens de otro', () => {
    const a = createTokenSigner();
    const b = createTokenSigner();
    expect(() => b.verify(a.sign(USER))).toThrow();
  });
});

describe('tokens de refresco', () => {
  it('son aleatorios y opacos', () => {
    const a = newRefreshToken();
    expect(a).not.toBe(newRefreshToken());
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('el hash es SHA-256 hexadecimal y no revela el token', () => {
    const token = newRefreshToken();
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
  });
});
