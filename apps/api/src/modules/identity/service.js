import { PRIVACY_POLICY_VERSION } from '@hw/contracts';
import { AppError } from '../../kernel/errors.js';
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS, hashToken, newRefreshToken } from './tokens.js';

/** Vigencia del enlace de recuperación (Diseño Integral: 15 minutos). */
export const RESET_TTL_SECONDS = 15 * 60;

const toPublicUser = (u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role });

/**
 * Casos de uso de identidad: registro, login, refresco rotatorio, cierre de sesión y usuario actual.
 * @param {{
 *   repository: ReturnType<import('./repository.js').createIdentityRepository>,
 *   signer: ReturnType<import('./tokens.js').createTokenSigner>,
 *   hasher: { hash: (plain: string) => Promise<string>, compare: (plain: string, hash: string) => Promise<boolean> },
 *   email?: { send: (message: { to: string, subject: string, text: string }) => Promise<void> },
 *   events?: { emit: (event: string, payload: unknown) => Promise<void> },
 *   webUrl?: string,
 *   onEmailError?: (error: unknown) => void,
 * }} deps `email` es el puerto de correo; `events`, el bus de eventos de dominio
 */
export function createIdentityService({
  repository,
  signer,
  hasher,
  email,
  events,
  webUrl = 'http://localhost:5173',
  onEmailError = () => {},
}) {
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

    /** Edita el perfil (por ahora solo el nombre). */
    async updateProfile(userId, { fullName }) {
      const user = await repository.updateFullName(userId, fullName);
      if (!user) throw new AppError('UNAUTHENTICATED');
      return toPublicUser(user);
    },

    /**
     * Cambia la contraseña con la actual como confirmación. Cierra todas las sesiones y abre una
     * nueva para este dispositivo (la ruta entrega su cookie): las demás tendrán que ingresar de nuevo.
     */
    async changePassword(userId, { currentPassword, newPassword }) {
      const user = await repository.findCredentialsById(userId);
      if (!user) throw new AppError('UNAUTHENTICATED');
      if (!(await hasher.compare(currentPassword, user.passwordHash))) {
        throw new AppError('INVALID_CREDENTIALS');
      }
      await repository.setPassword(userId, await hasher.hash(newPassword));
      await repository.deleteAllRefreshTokens(userId);
      const { refreshToken } = await openSession(user);
      return { refreshToken };
    },

    /**
     * Elimina la cuenta de un comprador (derecho de supresión, Ley 1581/2012): anonimiza los
     * datos personales, cierra las sesiones y publica `user.anonymized` para que otros módulos
     * actúen. Las cuentas de vendedor y administrador no se eliminan desde aquí.
     */
    async deleteAccount(userId, { password }) {
      const user = await repository.findCredentialsById(userId);
      if (!user) throw new AppError('UNAUTHENTICATED');
      if (user.role !== 'buyer') {
        throw new AppError('ROLE_FORBIDDEN', {
          message: 'Las cuentas de vendedor se eliminan por medio de soporte.',
        });
      }
      if (!(await hasher.compare(password, user.passwordHash))) {
        throw new AppError('INVALID_CREDENTIALS');
      }
      await repository.deleteAllRefreshTokens(userId);
      await repository.anonymize(userId);
      await events?.emit('user.anonymized', { userId });
    },

    /**
     * Recuperar contraseña, paso 1. Responde igual exista o no la cuenta: no se revela qué
     * correos están registrados. Un enlace nuevo deja sin efecto los anteriores.
     */
    async requestPasswordReset(emailAddress) {
      const user = await repository.findUserByEmail(emailAddress);
      if (!user || user.status !== 'active') return;
      const token = newRefreshToken();
      await repository.invalidateResetTokens(user.id);
      await repository.insertResetToken({
        userId: user.id,
        tokenHash: hashToken(token),
        ttlSeconds: RESET_TTL_SECONDS,
      });
      // Sin esperar el envío: así la respuesta tarda igual con o sin cuenta
      Promise.resolve(
        email?.send({
          to: user.email,
          subject: 'Restablece tu contraseña de PcBuilder',
          text:
            `Hola ${user.fullName},\n\n` +
            `Para elegir una contraseña nueva entra a este enlace (vale ${RESET_TTL_SECONDS / 60} minutos y sirve una sola vez):\n` +
            `${webUrl}/restablecer?token=${token}\n\n` +
            'Si no lo pediste, ignora este mensaje: tu contraseña no cambia.',
        }),
      ).catch(onEmailError);
    },

    /** Recuperar contraseña, paso 2: token de un solo uso. Cierra todas las sesiones de la cuenta. */
    async resetPassword({ token, password }) {
      const invalid = () => new AppError('INVALID_RESET_TOKEN');
      const stored = await repository.findResetToken(hashToken(token));
      if (!stored || stored.used || stored.expired) throw invalid();
      if (!(await repository.markResetTokenUsed(stored.id))) throw invalid();
      await repository.setPassword(stored.userId, await hasher.hash(password));
      await repository.invalidateResetTokens(stored.userId);
      await repository.deleteAllRefreshTokens(stored.userId);
    },

    /** Cambia el rol de la cuenta (p. ej. comprador → vendedor). Devuelve el usuario actualizado. */
    async setRole(userId, role) {
      const user = await repository.setRole(userId, role);
      if (!user) throw new AppError('UNAUTHENTICATED');
      return toPublicUser(user);
    },

    /** Token de acceso nuevo con el rol vigente en la base (el de refresco no cambia). */
    async issueAccessToken(userId) {
      const user = await repository.findUserById(userId);
      if (!user) throw new AppError('UNAUTHENTICATED');
      assertActive(user);
      return {
        accessToken: signer.sign(user),
        expiresIn: ACCESS_TTL_SECONDS,
        user: toPublicUser(user),
      };
    },

    /** Valida un token de acceso y devuelve quién es. Lo usa el resto de módulos vía la fachada. */
    authenticate(accessToken) {
      return signer.verify(accessToken);
    },
  };
}
