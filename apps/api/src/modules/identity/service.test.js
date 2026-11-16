import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../kernel/errors.js';
import { createIdentityService } from './service.js';
import { createTokenSigner, hashToken } from './tokens.js';

const hasher = {
  hash: vi.fn(async (p) => `hash(${p})`),
  compare: vi.fn(async (p, h) => h === `hash(${p})`),
};

const row = (extra = {}) => ({
  id: 'u1',
  email: 'ana@correo.co',
  fullName: 'Ana Pérez',
  role: 'buyer',
  status: 'active',
  passwordHash: 'hash(clave1234)',
  ...extra,
});

/** Repositorio en memoria con la misma interfaz que el real. */
function fakeRepository({ users = [row()] } = {}) {
  const tokens = [];
  const repo = {
    tokens,
    findUserByEmail: vi.fn(async (email) => users.find((u) => u.email === email) ?? null),
    findUserById: vi.fn(async (id) => users.find((u) => u.id === id) ?? null),
    createUser: vi.fn(async (data) => {
      const u = row({
        id: 'u2',
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
      });
      users.push(u);
      return u;
    }),
    touchLastLogin: vi.fn(async () => {}),
    insertRefreshToken: vi.fn(async ({ userId, tokenHash }) => {
      tokens.push({
        id: `t${tokens.length + 1}`,
        userId,
        tokenHash,
        revoked: false,
        expired: false,
      });
    }),
    findRefreshToken: vi.fn(async (hash) => tokens.find((t) => t.tokenHash === hash) ?? null),
    revokeRefreshToken: vi.fn(async (id) => {
      const t = tokens.find((x) => x.id === id);
      if (t.revoked) return false;
      t.revoked = true;
      return true;
    }),
    revokeAllRefreshTokens: vi.fn(async (userId) => {
      tokens.filter((t) => t.userId === userId).forEach((t) => (t.revoked = true));
    }),
  };
  return repo;
}

function setup(options) {
  const repository = fakeRepository(options);
  const signer = createTokenSigner({ secret: 'x'.repeat(40) });
  return { repository, signer, service: createIdentityService({ repository, signer, hasher }) };
}

describe('register', () => {
  it('crea la cuenta como comprador, guarda el hash (no la clave) y abre sesión', async () => {
    const { service, repository } = setup();
    const session = await service.register({
      email: 'nuevo@correo.co',
      password: 'clave1234',
      fullName: 'Nuevo',
    });
    expect(session.user).toEqual({
      id: 'u2',
      email: 'nuevo@correo.co',
      fullName: 'Nuevo',
      role: 'buyer',
    });
    expect(session.accessToken).toEqual(expect.any(String));
    expect(session.expiresIn).toBe(900);
    const saved = repository.createUser.mock.calls[0][0];
    expect(saved.passwordHash).toBe('hash(clave1234)');
    expect(saved.privacyPolicyVersion).toBe('2026-01');
    // en la base solo queda el hash del token de refresco
    expect(repository.tokens[0].tokenHash).toBe(hashToken(session.refreshToken));
  });

  it('un correo ya registrado lanza EMAIL_TAKEN (409)', async () => {
    const { service } = setup();
    await expect(
      service.register({ email: 'ana@correo.co', password: 'clave1234', fullName: 'Ana' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
  });

  it('si la base detecta el duplicado en una carrera, también es EMAIL_TAKEN', async () => {
    const { service, repository } = setup({ users: [] });
    repository.createUser.mockRejectedValueOnce(new AppError('VALIDATION_ERROR', { status: 409 }));
    await expect(
      service.register({ email: 'a@b.co', password: 'clave1234', fullName: 'Ana' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  it('otros errores de la base no se disfrazan', async () => {
    const { service, repository } = setup({ users: [] });
    repository.createUser.mockRejectedValueOnce(new Error('conexión caída'));
    await expect(
      service.register({ email: 'a@b.co', password: 'clave1234', fullName: 'Ana' }),
    ).rejects.toThrow('conexión caída');
  });
});

describe('login', () => {
  it('con credenciales correctas abre sesión y registra el último acceso', async () => {
    const { service, repository, signer } = setup();
    const session = await service.login({ email: 'ana@correo.co', password: 'clave1234' });
    expect(signer.verify(session.accessToken)).toEqual({ userId: 'u1', role: 'buyer' });
    expect(session.user).not.toHaveProperty('passwordHash');
    expect(repository.touchLastLogin).toHaveBeenCalledWith('u1');
  });

  it('clave incorrecta y correo inexistente dan el mismo error', async () => {
    const { service } = setup();
    const wrongPassword = service.login({ email: 'ana@correo.co', password: 'otra-clave1' });
    const unknownEmail = service.login({ email: 'nadie@correo.co', password: 'clave1234' });
    await expect(wrongPassword).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    await expect(unknownEmail).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });

  it('con correo inexistente igual se compara un hash (el tiempo no delata la cuenta)', async () => {
    hasher.compare.mockClear();
    const { service } = setup();
    await service.login({ email: 'nadie@correo.co', password: 'clave1234' }).catch(() => {});
    expect(hasher.compare).toHaveBeenCalledTimes(1);
  });

  it('una cuenta deshabilitada no entra aunque la clave sea correcta', async () => {
    const { service } = setup({ users: [row({ status: 'disabled' })] });
    await expect(
      service.login({ email: 'ana@correo.co', password: 'clave1234' }),
    ).rejects.toMatchObject({
      code: 'ROLE_FORBIDDEN',
      status: 403,
    });
  });
});

describe('refresh', () => {
  it('rota: el token usado queda revocado y se entrega uno nuevo', async () => {
    const { service, repository } = setup();
    const first = await service.login({ email: 'ana@correo.co', password: 'clave1234' });
    const second = await service.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(repository.tokens[0].revoked).toBe(true);
    expect(repository.tokens[1].revoked).toBe(false);
    expect(second.user.id).toBe('u1');
  });

  it('reusar un token ya rotado cierra todas las sesiones de la cuenta', async () => {
    const { service, repository } = setup();
    const first = await service.login({ email: 'ana@correo.co', password: 'clave1234' });
    const second = await service.refresh(first.refreshToken);
    await expect(service.refresh(first.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(repository.tokens.every((t) => t.revoked)).toBe(true);
    await expect(service.refresh(second.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('si otro proceso lo revocó justo antes, también se trata como reuso', async () => {
    const { service, repository } = setup();
    const first = await service.login({ email: 'ana@correo.co', password: 'clave1234' });
    repository.revokeRefreshToken.mockResolvedValueOnce(false);
    await expect(service.refresh(first.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(repository.revokeAllRefreshTokens).toHaveBeenCalledWith('u1');
  });

  it.each([
    ['sin cookie', undefined],
    ['token desconocido', 'inventado'],
  ])('rechaza: %s', async (_n, token) => {
    const { service } = setup();
    await expect(service.refresh(token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('un token vencido se rechaza sin revocar nada', async () => {
    const { service, repository } = setup();
    const s = await service.login({ email: 'ana@correo.co', password: 'clave1234' });
    repository.tokens[0].expired = true;
    await expect(service.refresh(s.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(repository.revokeAllRefreshTokens).not.toHaveBeenCalled();
  });

  it('una cuenta deshabilitada después del login ya no puede refrescar', async () => {
    const users = [row()];
    const { service } = setup({ users });
    const s = await service.login({ email: 'ana@correo.co', password: 'clave1234' });
    users[0].status = 'disabled';
    await expect(service.refresh(s.refreshToken)).rejects.toMatchObject({ code: 'ROLE_FORBIDDEN' });
  });
});

describe('logout, getMe y authenticate', () => {
  it('logout revoca el token y es idempotente', async () => {
    const { service, repository } = setup();
    const s = await service.login({ email: 'ana@correo.co', password: 'clave1234' });
    await service.logout(s.refreshToken);
    expect(repository.tokens[0].revoked).toBe(true);
    await expect(service.logout(s.refreshToken)).resolves.toBeUndefined();
    await expect(service.logout(undefined)).resolves.toBeUndefined();
    await expect(service.logout('desconocido')).resolves.toBeUndefined();
    await expect(service.refresh(s.refreshToken)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
  });

  it('getMe devuelve el usuario sin datos sensibles; si no existe, UNAUTHENTICATED', async () => {
    const { service } = setup();
    expect(await service.getMe('u1')).toEqual({
      id: 'u1',
      email: 'ana@correo.co',
      fullName: 'Ana Pérez',
      role: 'buyer',
    });
    await expect(service.getMe('zzz')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('authenticate valida el token de acceso', async () => {
    const { service } = setup();
    const s = await service.login({ email: 'ana@correo.co', password: 'clave1234' });
    expect(service.authenticate(s.accessToken)).toEqual({ userId: 'u1', role: 'buyer' });
    expect(() => service.authenticate('mal')).toThrow();
  });
});
