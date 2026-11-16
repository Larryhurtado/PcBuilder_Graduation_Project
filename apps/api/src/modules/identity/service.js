import { PRIVACY_POLICY_VERSION } from '@hw/contracts';
import { AppError } from '../../kernel/errors.js';
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS, hashToken, newRefreshToken } from './tokens.js';

const toPublicUser = (u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role });

/**
 * Casos de uso de identidad: registro, login, refresco rotatorio, cierre de sesión y usuario actual.
 * @param {{
 *   repository: ReturnType<import('./repository.js').createIdentityRepository>,
 *   signer: ReturnType<import('./tokens.js').createTokenSigner>,
 *   hasher: { hash: (plain: string) => Promise<string>, compare: (plain: string, hash: string) => Promise<boolean> },
 * }} deps
 */
export function createIdentityService({ repository, signer, hasher }) {
  // Hash de relleno: si el correo no existe se compara igual, para que el tiempo no delate quién tiene cuenta.
  let dummyHash;
  const getDummyHash = () => (dummyHash ??= hasher.hash('relleno-sin-uso-1'));

  async function openSession(user) {
    const refreshToken = newRefreshToken();
    await repository.insertRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      ttlSeconds: REFRESH_TTL_SECONDS,
    });
    return {
      accessToken: signer.sign(user),
      expiresIn: ACCESS_TTL_SECONDS,
      user: toPublicUser(user),
      refreshToken,
    };
  }

  function assertActive(user) {
    if (user.status !== 'active') {
      throw new AppError('ROLE_FORBIDDEN', { message: 'Tu cuenta está deshabilitada.' });
    }
  }

  return {
    async register({ email, password, fullName }) {
      if (await repository.findUserByEmail(email)) throw new AppError('EMAIL_TAKEN');
      const passwordHash = await hasher.hash(password);
      let user;
      try {
        user = await repository.createUser({
          email,
          passwordHash,
          fullName,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        });
      } catch (error) {
        // Dos registros simultáneos con el mismo correo: gana el primero
        if (error instanceof AppError && error.status === 409) throw new AppError('EMAIL_TAKEN');
        throw error;
      }
      return openSession(user);
    },

    async login({ email, password }) {
      const user = await repository.findUserByEmail(email);
      const matches = await hasher.compare(password, user?.passwordHash ?? (await getDummyHash()));
      if (!user || !matches) throw new AppError('INVALID_CREDENTIALS');
      assertActive(user);
      await repository.touchLastLogin(user.id);
      return openSession(user);
    },

    /** Rotación: cada token de refresco sirve una sola vez. Reusar uno ya usado cierra todas las sesiones. */
    async refresh(refreshToken) {
      if (!refreshToken) throw new AppError('UNAUTHENTICATED');
      const stored = await repository.findRefreshToken(hashToken(refreshToken));
      if (!stored || stored.expired) throw new AppError('UNAUTHENTICATED');
      if (stored.revoked || !(await repository.revokeRefreshToken(stored.id))) {
        await repository.revokeAllRefreshTokens(stored.userId);
        throw new AppError('UNAUTHENTICATED');
      }
      const user = await repository.findUserById(stored.userId);
      if (!user) throw new AppError('UNAUTHENTICATED');
      assertActive(user);
      return openSession(user);
    },

    /** Idempotente: un token desconocido o ya revocado no es un error. */
    async logout(refreshToken) {
      if (!refreshToken) return;
      const stored = await repository.findRefreshToken(hashToken(refreshToken));
      if (stored && !stored.revoked) await repository.revokeRefreshToken(stored.id);
    },

    async getMe(userId) {
      const user = await repository.findUserById(userId);
      if (!user) throw new AppError('UNAUTHENTICATED');
      return toPublicUser(user);
    },

    /** Valida un token de acceso y devuelve quién es. Lo usa el resto de módulos vía la fachada. */
    authenticate(accessToken) {
      return signer.verify(accessToken);
    },
  };
}
