// Perfil, cambio de contraseña, eliminación de cuenta y recuperación de contraseña.
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuthMiddleware } from '../../http/auth.js';
import { errorHandler, notFoundHandler } from '../../http/error-handler.js';
import { requestId } from '../../http/request-id.js';
import { AppError } from '../../kernel/errors.js';
import { createMemoryEmail } from '../../kernel/email.js';
import { createIdentityRepository } from './repository.js';
import { createIdentityRouter } from './routes.js';
import { RESET_TTL_SECONDS, createIdentityService } from './service.js';
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

function fakeRepository({ user = row() } = {}) {
  const resetTokens = [];
  const refreshTokens = [];
  return {
    resetTokens,
    refreshTokens,
    findUserByEmail: vi.fn(async (email) => (user && user.email === email ? user : null)),
    findCredentialsById: vi.fn(async (id) => (user && user.id === id ? user : null)),
    updateFullName: vi.fn(async (id, fullName) =>
      user && user.id === id ? { ...user, fullName } : null,
    ),
    setPassword: vi.fn(async () => {}),
    anonymize: vi.fn(async () => true),
    revokeAllRefreshTokens: vi.fn(async () => {}),
    deleteAllRefreshTokens: vi.fn(async () => {}),
    insertRefreshToken: vi.fn(async (t) => refreshTokens.push(t)),
    invalidateResetTokens: vi.fn(async () => {
      for (const t of resetTokens) t.used = true;
    }),
    insertResetToken: vi.fn(async ({ userId, tokenHash }) => {
      resetTokens.push({
        id: `r${resetTokens.length + 1}`,
        userId,
        tokenHash,
        used: false,
        expired: false,
      });
    }),
    findResetToken: vi.fn(async (hash) => resetTokens.find((t) => t.tokenHash === hash) ?? null),
    markResetTokenUsed: vi.fn(async (id) => {
      const t = resetTokens.find((x) => x.id === id);
      if (t.used) return false;
      t.used = true;
      return true;
    }),
  };
}

function setup(options) {
  const repository = fakeRepository(options);
  const email = createMemoryEmail();
  const events = { emit: vi.fn(async () => {}) };
  const service = createIdentityService({
    repository,
    signer: createTokenSigner({ secret: 'x'.repeat(40) }),
    hasher,
    email,
    events,
    webUrl: 'http://localhost:5173',
  });
  return { service, repository, email, events };
}

describe('updateProfile', () => {
  it('cambia el nombre y devuelve el usuario público', async () => {
    const { service, repository } = setup();
    expect(await service.updateProfile('u1', { fullName: 'Ana María' })).toEqual({
      id: 'u1',
      email: 'ana@correo.co',
      fullName: 'Ana María',
      role: 'buyer',
    });
    expect(repository.updateFullName).toHaveBeenCalledWith('u1', 'Ana María');
  });

  it('un usuario inexistente da 401', async () => {
    const { service } = setup({ user: null });
    await expect(service.updateProfile('u1', { fullName: 'Ana' })).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('changePassword', () => {
  it('con la contraseña actual correcta cambia el hash, cierra todas las sesiones y abre una nueva', async () => {
    const { service, repository } = setup();
    const result = await service.changePassword('u1', {
      currentPassword: 'clave1234',
      newPassword: 'nueva-clave9',
    });
    expect(repository.setPassword).toHaveBeenCalledWith('u1', 'hash(nueva-clave9)');
    expect(repository.deleteAllRefreshTokens).toHaveBeenCalledWith('u1');
    // la sesión nueva se abre DESPUÉS de revocar todas
    expect(repository.deleteAllRefreshTokens.mock.invocationCallOrder[0]).toBeLessThan(
      repository.insertRefreshToken.mock.invocationCallOrder[0],
    );
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(repository.refreshTokens[0].tokenHash).toBe(hashToken(result.refreshToken));
  });

  it('con la actual incorrecta da 401 INVALID_CREDENTIALS y no cambia nada', async () => {
    const { service, repository } = setup();
    await expect(
      service.changePassword('u1', { currentPassword: 'equivocada1', newPassword: 'nueva-clave9' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    expect(repository.setPassword).not.toHaveBeenCalled();
    expect(repository.deleteAllRefreshTokens).not.toHaveBeenCalled();
  });
});

describe('deleteAccount', () => {
  it('un comprador con la contraseña correcta: cierra sesiones, anonimiza y publica user.anonymized', async () => {
    const { service, repository, events } = setup();
    await service.deleteAccount('u1', { password: 'clave1234' });
    expect(repository.deleteAllRefreshTokens).toHaveBeenCalledWith('u1');
    expect(repository.anonymize).toHaveBeenCalledWith('u1');
    expect(events.emit).toHaveBeenCalledWith('user.anonymized', { userId: 'u1' });
  });

  it('con la contraseña incorrecta da 401 y no borra nada', async () => {
    const { service, repository, events } = setup();
    await expect(service.deleteAccount('u1', { password: 'mal-clave1' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(repository.anonymize).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it.each(['seller', 'admin'])('una cuenta %s no se elimina desde aquí (403)', async (role) => {
    const { service, repository } = setup({ user: row({ role }) });
    await expect(service.deleteAccount('u1', { password: 'clave1234' })).rejects.toMatchObject({
      code: 'ROLE_FORBIDDEN',
      status: 403,
    });
    expect(repository.anonymize).not.toHaveBeenCalled();
  });
});

describe('recuperar contraseña', () => {
  const tokenFrom = (email) => /token=([^\s]+)/.exec(email.sent[0].text)[1];

  it('forgot: guarda solo el hash del token y envía un enlace de 15 minutos al correo', async () => {
    const { service, repository, email } = setup();
    await service.requestPasswordReset('ana@correo.co');
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('ana@correo.co');
    expect(email.sent[0].text).toContain('http://localhost:5173/restablecer?token=');
    expect(email.sent[0].text).toContain('15 minutos');
    const token = tokenFrom(email);
    expect(repository.resetTokens[0].tokenHash).toBe(hashToken(token));
    expect(repository.resetTokens[0].tokenHash).not.toContain(token);
    expect(RESET_TTL_SECONDS).toBe(900);
  });

  it('forgot con un correo desconocido o una cuenta deshabilitada no envía nada ni falla', async () => {
    const unknown = setup();
    await expect(unknown.service.requestPasswordReset('nadie@correo.co')).resolves.toBeUndefined();
    expect(unknown.email.sent).toHaveLength(0);
    const disabled = setup({ user: row({ status: 'disabled' }) });
    await disabled.service.requestPasswordReset('ana@correo.co');
    expect(disabled.email.sent).toHaveLength(0);
    expect(disabled.repository.insertResetToken).not.toHaveBeenCalled();
  });

  it('un fallo al enviar el correo no rompe la respuesta (se reporta aparte)', async () => {
    const repository = fakeRepository();
    const onEmailError = vi.fn();
    const service = createIdentityService({
      repository,
      signer: createTokenSigner({ secret: 'x'.repeat(40) }),
      hasher,
      email: {
        send: vi.fn(async () => {
          throw new Error('SMTP caído');
        }),
      },
      onEmailError,
    });
    await expect(service.requestPasswordReset('ana@correo.co')).resolves.toBeUndefined();
    await new Promise((resolve) => setImmediate(resolve));
    expect(onEmailError).toHaveBeenCalled();
  });

  it('un enlace nuevo deja sin efecto el anterior', async () => {
    const { service, email } = setup();
    await service.requestPasswordReset('ana@correo.co');
    const first = tokenFrom(email);
    await service.requestPasswordReset('ana@correo.co');
    await expect(
      service.resetPassword({ token: first, password: 'nueva-clave9' }),
    ).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
      status: 400,
    });
    const second = /token=([^\s]+)/.exec(email.sent[1].text)[1];
    await expect(
      service.resetPassword({ token: second, password: 'nueva-clave9' }),
    ).resolves.toBeUndefined();
  });

  it('reset: cambia la contraseña, cierra todas las sesiones y el token sirve una sola vez', async () => {
    const { service, repository, email } = setup();
    await service.requestPasswordReset('ana@correo.co');
    const token = tokenFrom(email);
    await service.resetPassword({ token, password: 'nueva-clave9' });
    expect(repository.setPassword).toHaveBeenCalledWith('u1', 'hash(nueva-clave9)');
    expect(repository.deleteAllRefreshTokens).toHaveBeenCalledWith('u1');
    await expect(service.resetPassword({ token, password: 'otra-clave99' })).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    });
    expect(repository.setPassword).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['desconocido', () => 'inventado'],
    [
      'vencido',
      (repository) => {
        repository.resetTokens[0].expired = true;
      },
    ],
  ])(
    'reset con un token %s da 400 INVALID_RESET_TOKEN y no cambia la contraseña',
    async (_n, tamper) => {
      const { service, repository, email } = setup();
      await service.requestPasswordReset('ana@correo.co');
      const token = tamper(repository) ?? tokenFrom(email);
      await expect(
        service.resetPassword({ token, password: 'nueva-clave9' }),
      ).rejects.toMatchObject({
        code: 'INVALID_RESET_TOKEN',
      });
      expect(repository.setPassword).not.toHaveBeenCalled();
    },
  );

  it('si otro proceso gasta el token justo antes, falla igual (un solo uso)', async () => {
    const { service, repository, email } = setup();
    await service.requestPasswordReset('ana@correo.co');
    repository.markResetTokenUsed.mockResolvedValueOnce(false);
    await expect(
      service.resetPassword({ token: tokenFrom(email), password: 'nueva-clave9' }),
    ).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    });
    expect(repository.setPassword).not.toHaveBeenCalled();
  });
});

describe('repositorio: perfil, contraseña y recuperación', () => {
  const db = (rows = [{ id: 'u1' }], rowCount = 1) => ({
    query: vi.fn(async () => ({ rows, rowCount })),
  });

  it('anonymize borra los datos personales, deshabilita la cuenta y borra los tokens de recuperación', async () => {
    const d = db();
    expect(await createIdentityRepository(d).anonymize('u1')).toBe(true);
    const [update, cleanup] = d.query.mock.calls;
    expect(update[0]).toContain("full_name = 'Usuario eliminado'");
    expect(update[0]).toContain("status = 'disabled'");
    expect(update[0]).toContain('anonymized_at = now()');
    expect(update[0]).toContain('anonymized_at IS NULL'); // no se anonimiza dos veces
    expect(update[0]).not.toContain('$2');
    expect(update[1]).toEqual(['u1']);
    expect(cleanup[0]).toContain('DELETE FROM identity.password_reset_tokens');
  });

  it('markResetTokenUsed solo gasta tokens sin usar y dice si lo logró', async () => {
    expect(await createIdentityRepository(db([], 1)).markResetTokenUsed('r1')).toBe(true);
    const d = db([], 0);
    expect(await createIdentityRepository(d).markResetTokenUsed('r1')).toBe(false);
    expect(d.query.mock.calls[0][0]).toContain('used_at IS NULL');
  });

  it('insertResetToken calcula el vencimiento en la base; findResetToken busca por hash', async () => {
    const d = db([{ id: 'r1' }]);
    const repo = createIdentityRepository(d);
    await repo.insertResetToken({ userId: 'u1', tokenHash: 'h', ttlSeconds: 900 });
    expect(d.query.mock.calls[0][0]).toContain('make_interval(secs => $3::double precision)');
    expect(d.query.mock.calls[0][1]).toEqual(['u1', 'h', 900]);
    expect((await repo.findResetToken('h')).id).toBe('r1');
  });

  it('updateFullName, setPassword e invalidateResetTokens usan parámetros', async () => {
    const d = db();
    const repo = createIdentityRepository(d);
    await repo.updateFullName('u1', 'Ana');
    await repo.setPassword('u1', 'H');
    await repo.invalidateResetTokens('u1');
    expect(d.query.mock.calls.map((c) => c[1])).toEqual([['u1', 'Ana'], ['u1', 'H'], ['u1']]);
  });
});

describe('rutas de cuenta', () => {
  function appWith({ forgotRateLimitOptions, rateLimitOptions } = {}) {
    const service = {
      updateProfile: vi.fn(async (_id, { fullName }) => ({
        id: 'u1',
        email: 'a@b.co',
        fullName,
        role: 'buyer',
      })),
      changePassword: vi.fn(async () => ({ refreshToken: 'refresco-nuevo' })),
      deleteAccount: vi.fn(async () => {}),
      requestPasswordReset: vi.fn(async () => {}),
      resetPassword: vi.fn(async () => {}),
    };
    const { requireAuth } = createAuthMiddleware((t) => {
      if (t !== 'ok') throw new AppError('UNAUTHENTICATED');
      return { userId: 'u1', role: 'buyer' };
    });
    const app = express();
    app.use(requestId);
    app.use(express.json());
    app.use(cookieParser());
    app.use(
      '/api/v1',
      createIdentityRouter({ service, requireAuth, forgotRateLimitOptions, rateLimitOptions }),
    );
    app.use(notFoundHandler);
    app.use(errorHandler);
    return { app, service };
  }
  const as = { Authorization: 'Bearer ok' };
  const cookieOf = (res) =>
    (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('refresh_token='));

  it('POST /auth/forgot responde 200 {} y normaliza el correo; un correo mal escrito da 422', async () => {
    const { app, service } = appWith();
    const res = await request(app).post('/api/v1/auth/forgot').send({ email: ' ANA@Correo.co ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
    expect(service.requestPasswordReset).toHaveBeenCalledWith('ana@correo.co');
    expect((await request(app).post('/api/v1/auth/forgot').send({ email: 'x' })).status).toBe(422);
    expect((await request(app).post('/api/v1/auth/forgot').send({})).status).toBe(422);
  });

  it('forgot tiene un límite estricto por IP (429)', async () => {
    const { app } = appWith({ forgotRateLimitOptions: { limit: 2 } });
    const go = () => request(app).post('/api/v1/auth/forgot').send({ email: 'a@b.co' });
    expect((await go()).status).toBe(200);
    expect((await go()).status).toBe(200);
    const limited = await go();
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
  });

  it('POST /auth/reset responde 204 y valida la contraseña nueva con las reglas del registro', async () => {
    const { app, service } = appWith();
    expect(
      (await request(app).post('/api/v1/auth/reset').send({ token: 't', password: 'nueva-clave9' }))
        .status,
    ).toBe(204);
    expect(service.resetPassword).toHaveBeenCalledWith({ token: 't', password: 'nueva-clave9' });
    for (const bad of [
      { token: 't', password: 'corta1' },
      { token: 't', password: 'solo-letras' },
      { password: 'nueva-clave9' },
      { token: '', password: 'nueva-clave9' },
    ]) {
      expect((await request(app).post('/api/v1/auth/reset').send(bad)).status).toBe(422);
    }
  });

  it('un token inválido llega como 400 INVALID_RESET_TOKEN', async () => {
    const { app, service } = appWith();
    service.resetPassword.mockRejectedValueOnce(new AppError('INVALID_RESET_TOKEN'));
    const res = await request(app)
      .post('/api/v1/auth/reset')
      .send({ token: 't', password: 'nueva-clave9' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_RESET_TOKEN');
  });

  it('PATCH /me exige sesión, recorta el nombre y valida el largo', async () => {
    const { app, service } = appWith();
    expect((await request(app).patch('/api/v1/me').send({ fullName: 'Ana' })).status).toBe(401);
    const res = await request(app).patch('/api/v1/me').set(as).send({ fullName: '  Ana María  ' });
    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe('Ana María');
    expect(service.updateProfile).toHaveBeenCalledWith('u1', { fullName: 'Ana María' });
    for (const bad of [
      { fullName: 'A' },
      { fullName: 'x'.repeat(121) },
      {},
      { fullName: 'Ana', role: 'admin' },
    ]) {
      expect((await request(app).patch('/api/v1/me').set(as).send(bad)).status).toBe(422);
    }
  });

  it('POST /me/password responde 204, valida la nueva y entrega la cookie de refresco nueva', async () => {
    const { app, service } = appWith();
    expect((await request(app).post('/api/v1/me/password').send({})).status).toBe(401);
    const res = await request(app)
      .post('/api/v1/me/password')
      .set(as)
      .send({ currentPassword: 'clave1234', newPassword: 'nueva-clave9' });
    expect(res.status).toBe(204);
    expect(service.changePassword).toHaveBeenCalledWith('u1', {
      currentPassword: 'clave1234',
      newPassword: 'nueva-clave9',
    });
    const cookie = cookieOf(res);
    expect(cookie).toContain('refresco-nuevo');
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toContain('Path=/api/v1/auth');
    for (const bad of [
      { currentPassword: 'clave1234', newPassword: 'corta1' },
      { newPassword: 'nueva-clave9' },
      { currentPassword: '', newPassword: 'nueva-clave9' },
    ]) {
      expect((await request(app).post('/api/v1/me/password').set(as).send(bad)).status).toBe(422);
    }
  });

  it('POST /me/password: la actual incorrecta da 401 INVALID_CREDENTIALS y no toca la cookie', async () => {
    const { app, service } = appWith();
    service.changePassword.mockRejectedValueOnce(new AppError('INVALID_CREDENTIALS'));
    const res = await request(app)
      .post('/api/v1/me/password')
      .set(as)
      .send({ currentPassword: 'mal-clave1', newPassword: 'nueva-clave9' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
    expect(cookieOf(res)).toBeUndefined();
  });

  it('DELETE /me pide la contraseña, responde 204 y borra la cookie de refresco', async () => {
    const { app, service } = appWith();
    expect((await request(app).delete('/api/v1/me').send({ password: 'x' })).status).toBe(401);
    expect((await request(app).delete('/api/v1/me').set(as).send({})).status).toBe(422);
    const res = await request(app).delete('/api/v1/me').set(as).send({ password: 'clave1234' });
    expect(res.status).toBe(204);
    expect(service.deleteAccount).toHaveBeenCalledWith('u1', { password: 'clave1234' });
    expect(cookieOf(res)).toMatch(/refresh_token=;/);
  });
});

describe('repositorio: borrar los tokens de refresco', () => {
  it('deleteAllRefreshTokens borra (no revoca) todos los del usuario', async () => {
    const d = { query: vi.fn(async () => ({ rows: [], rowCount: 2 })) };
    await createIdentityRepository(d).deleteAllRefreshTokens('u1');
    expect(d.query.mock.calls[0][0]).toContain('DELETE FROM identity.refresh_tokens');
    expect(d.query.mock.calls[0][1]).toEqual(['u1']);
  });
});
