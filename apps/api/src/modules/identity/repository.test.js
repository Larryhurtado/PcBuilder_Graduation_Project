import { describe, expect, it, vi } from 'vitest';
import { createIdentityRepository } from './repository.js';

const dbReturning = (rows = [], rowCount = rows.length) => ({
  query: vi.fn(async () => ({ rows, rowCount })),
});

describe('identity repository', () => {
  it('findUserByEmail y findUserById devuelven la fila o null, con parámetros', async () => {
    const db = dbReturning([{ id: 'u1' }]);
    const repo = createIdentityRepository(db);
    expect(await repo.findUserByEmail('a@b.co')).toEqual({ id: 'u1' });
    expect(db.query.mock.calls[0][1]).toEqual(['a@b.co']);
    expect(await createIdentityRepository(dbReturning()).findUserById('x')).toBeNull();
  });

  it('createUser guarda hash, consentimiento y versión de la política', async () => {
    const db = dbReturning([{ id: 'u1' }]);
    await createIdentityRepository(db).createUser({
      email: 'a@b.co',
      passwordHash: 'H',
      fullName: 'Ana',
      privacyPolicyVersion: '2026-01',
    });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('terms_accepted_at');
    expect(params).toEqual(['a@b.co', 'H', 'Ana', '2026-01']);
  });

  it('insertRefreshToken calcula el vencimiento en la base', async () => {
    const db = dbReturning();
    await createIdentityRepository(db).insertRefreshToken({
      userId: 'u1',
      tokenHash: 'h',
      ttlSeconds: 60,
    });
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('make_interval(secs => $3::double precision)');
    expect(params).toEqual(['u1', 'h', 60]);
  });

  it('revokeRefreshToken solo actúa sobre tokens no revocados y dice si lo logró', async () => {
    const ok = dbReturning([], 1);
    expect(await createIdentityRepository(ok).revokeRefreshToken('t1')).toBe(true);
    expect(ok.query.mock.calls[0][0]).toContain('revoked_at IS NULL');
    expect(await createIdentityRepository(dbReturning([], 0)).revokeRefreshToken('t1')).toBe(false);
  });

  it('revokeAllRefreshTokens y touchLastLogin usan el id del usuario', async () => {
    const db = dbReturning();
    const repo = createIdentityRepository(db);
    await repo.revokeAllRefreshTokens('u1');
    await repo.touchLastLogin('u1');
    expect(db.query.mock.calls.map((c) => c[1])).toEqual([['u1'], ['u1']]);
  });

  it('findRefreshToken busca por hash', async () => {
    const db = dbReturning([{ id: 't1', userId: 'u1', revoked: false, expired: false }]);
    expect((await createIdentityRepository(db).findRefreshToken('h')).id).toBe('t1');
    expect(db.query.mock.calls[0][1]).toEqual(['h']);
  });
});
