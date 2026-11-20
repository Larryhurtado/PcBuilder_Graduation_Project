const USER_COLUMNS =
  'id, email::text AS email, full_name, role::text AS role, status::text AS status';

/** Acceso a `identity.users` e `identity.refresh_tokens`. @param {{ query: Function }} db */
export function createIdentityRepository(db) {
  return {
    async findUserByEmail(email) {
      const { rows } = await db.query(
        `SELECT ${USER_COLUMNS}, password_hash FROM identity.users WHERE email = $1`,
        [email],
      );
      return rows[0] ?? null;
    },

    async findUserById(id) {
      const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM identity.users WHERE id = $1`, [
        id,
      ]);
      return rows[0] ?? null;
    },

    async createUser({ email, passwordHash, fullName, privacyPolicyVersion }) {
      const { rows } = await db.query(
        `INSERT INTO identity.users (email, password_hash, full_name, terms_accepted_at, privacy_policy_version)
         VALUES ($1, $2, $3, now(), $4)
         RETURNING ${USER_COLUMNS}`,
        [email, passwordHash, fullName, privacyPolicyVersion],
      );
      return rows[0];
    },

    async setRole(userId, role) {
      const { rows } = await db.query(
        `UPDATE identity.users SET role = $2::identity.user_role, updated_at = now()
          WHERE id = $1 RETURNING ${USER_COLUMNS}`,
        [userId, role],
      );
      return rows[0] ?? null;
    },

    /** Usuario con su hash de contraseña (para verificar la contraseña actual). */
    async findCredentialsById(id) {
      const { rows } = await db.query(
        `SELECT ${USER_COLUMNS}, password_hash FROM identity.users WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async updateFullName(userId, fullName) {
      const { rows } = await db.query(
        `UPDATE identity.users SET full_name = $2, updated_at = now()
          WHERE id = $1 RETURNING ${USER_COLUMNS}`,
        [userId, fullName],
      );
      return rows[0] ?? null;
    },

    async setPassword(userId, passwordHash) {
      await db.query(
        'UPDATE identity.users SET password_hash = $2, updated_at = now() WHERE id = $1',
        [userId, passwordHash],
      );
    },

    /**
     * Derecho de supresión (Ley 1581/2012): se borran los datos personales y la cuenta queda
     * deshabilitada. La fila se conserva (otras tablas la referencian) pero ya no identifica a nadie.
     */
    async anonymize(userId) {
      const { rowCount } = await db.query(
        `UPDATE identity.users
            SET email = 'eliminado-' || id::text || '@anonimizado.invalid',
                full_name = 'Usuario eliminado',
                password_hash = '!',
                status = 'disabled',
                last_login_at = NULL,
                anonymized_at = now(),
                updated_at = now()
          WHERE id = $1 AND anonymized_at IS NULL`,
        [userId],
      );
      await db.query('DELETE FROM identity.password_reset_tokens WHERE user_id = $1', [userId]);
      return rowCount > 0;
    },

    /** Un enlace nuevo deja sin efecto los anteriores. */
    async invalidateResetTokens(userId) {
      await db.query(
        'UPDATE identity.password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
        [userId],
      );
    },

    async insertResetToken({ userId, tokenHash, ttlSeconds }) {
      await db.query(
        `INSERT INTO identity.password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + make_interval(secs => $3::double precision))`,
        [userId, tokenHash, ttlSeconds],
      );
    },

    async findResetToken(tokenHash) {
      const { rows } = await db.query(
        `SELECT id, user_id, used_at IS NOT NULL AS used, expires_at <= now() AS expired
           FROM identity.password_reset_tokens WHERE token_hash = $1`,
        [tokenHash],
      );
      return rows[0] ?? null;
    },

    /** Marca el token como usado. Devuelve false si otro proceso lo usó antes (un solo uso). */
    async markResetTokenUsed(id) {
      const { rowCount } = await db.query(
        'UPDATE identity.password_reset_tokens SET used_at = now() WHERE id = $1 AND used_at IS NULL',
        [id],
      );
      return rowCount > 0;
    },

    async touchLastLogin(userId) {
      await db.query('UPDATE identity.users SET last_login_at = now() WHERE id = $1', [userId]);
    },

    async insertRefreshToken({ userId, tokenHash, ttlSeconds }) {
      await db.query(
        `INSERT INTO identity.refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + make_interval(secs => $3::double precision))`,
        [userId, tokenHash, ttlSeconds],
      );
    },

    async findRefreshToken(tokenHash) {
      const { rows } = await db.query(
        `SELECT id, user_id, revoked_at IS NOT NULL AS revoked, expires_at <= now() AS expired
           FROM identity.refresh_tokens WHERE token_hash = $1`,
        [tokenHash],
      );
      return rows[0] ?? null;
    },

    /** Revoca un token. Devuelve false si ya estaba revocado (otro proceso lo usó antes). */
    async revokeRefreshToken(id) {
      const { rowCount } = await db.query(
        'UPDATE identity.refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
        [id],
      );
      return rowCount > 0;
    },

    /**
     * Borra todos los tokens de refresco del usuario (cambio o recuperación de contraseña, cuenta
     * eliminada). A diferencia de revocarlos, un token borrado que se reuse es simplemente
     * desconocido: no dispara la alarma de robo que cierra también la sesión legítima.
     */
    async deleteAllRefreshTokens(userId) {
      await db.query('DELETE FROM identity.refresh_tokens WHERE user_id = $1', [userId]);
    },

    async revokeAllRefreshTokens(userId) {
      await db.query(
        'UPDATE identity.refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId],
      );
    },
  };
}
