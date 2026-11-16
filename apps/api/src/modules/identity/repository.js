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

    async revokeAllRefreshTokens(userId) {
      await db.query(
        'UPDATE identity.refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId],
      );
    },
  };
}
