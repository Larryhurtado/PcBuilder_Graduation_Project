import { describe, expect, it } from 'vitest';
import {
  authResponseSchema,
  forgotBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetBodySchema,
} from './index.js';

const ok = { email: 'Ana@Correo.co', password: 'clave1234', fullName: ' Ana ', acceptTerms: true };

describe('registerBodySchema', () => {
  it('normaliza el correo (minúsculas, sin espacios) y el nombre', () => {
    const parsed = registerBodySchema.parse({ ...ok, email: '  Ana@Correo.co ' });
    expect(parsed.email).toBe('ana@correo.co');
    expect(parsed.fullName).toBe('Ana');
  });

  it('exige aceptar el tratamiento de datos', () => {
    expect(registerBodySchema.safeParse({ ...ok, acceptTerms: false }).success).toBe(false);
    expect(registerBodySchema.safeParse({ ...ok, acceptTerms: undefined }).success).toBe(false);
  });

  it('valida la clave: 8 a 72 caracteres con letra y número', () => {
    for (const bad of ['corta1', 'sololetras', '12345678', 'a1'.repeat(37)]) {
      expect(registerBodySchema.safeParse({ ...ok, password: bad }).success, bad).toBe(false);
    }
    expect(registerBodySchema.safeParse({ ...ok, password: 'abcd1234' }).success).toBe(true);
  });

  it('no deja que el cliente elija rol u otros campos', () => {
    expect(registerBodySchema.safeParse({ ...ok, role: 'admin' }).success).toBe(false);
  });
});

describe('loginBodySchema y authResponseSchema', () => {
  it('el login no exige formato de clave', () => {
    expect(loginBodySchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(loginBodySchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });

  it('la respuesta lleva token, vigencia y usuario (sin token de refresco)', () => {
    const body = {
      accessToken: 't',
      expiresIn: 900,
      user: {
        id: '6b03b443-7b22-491c-b301-7e2a285359df',
        email: 'a@b.co',
        fullName: 'Ana',
        role: 'buyer',
      },
    };
    expect(authResponseSchema.safeParse(body).success).toBe(true);
    expect(
      authResponseSchema.safeParse({ ...body, user: { ...body.user, role: 'dios' } }).success,
    ).toBe(false);
  });
});

describe('forgotBodySchema', () => {
  it('pide solo el correo y lo normaliza', () => {
    expect(forgotBodySchema.parse({ email: '  Ana@Correo.co ' })).toEqual({
      email: 'ana@correo.co',
    });
  });

  it('rechaza un correo mal escrito y los campos de más', () => {
    expect(forgotBodySchema.safeParse({ email: 'no-es-correo' }).success).toBe(false);
    expect(forgotBodySchema.safeParse({ email: 'ana@correo.co', role: 'admin' }).success).toBe(
      false,
    );
    expect(forgotBodySchema.safeParse({}).success).toBe(false);
  });
});

describe('resetBodySchema', () => {
  it('pide el token y una contraseña con las reglas del registro', () => {
    expect(resetBodySchema.safeParse({ token: 'abc', password: 'abcd1234' }).success).toBe(true);
    for (const bad of ['corta1', 'sololetras', '12345678']) {
      expect(resetBodySchema.safeParse({ token: 'abc', password: bad }).success, bad).toBe(false);
    }
  });

  it('rechaza el token vacío o ausente', () => {
    expect(resetBodySchema.safeParse({ token: '  ', password: 'abcd1234' }).success).toBe(false);
    expect(resetBodySchema.safeParse({ password: 'abcd1234' }).success).toBe(false);
  });
});

describe('cuenta: perfil, cambio de contraseña y eliminación', () => {
  it('updateMeBodySchema: nombre de 2 a 120 caracteres, recortado, sin otros campos', async () => {
    const { updateMeBodySchema } = await import('./index.js');
    expect(updateMeBodySchema.parse({ fullName: '  Ana  ' })).toEqual({ fullName: 'Ana' });
    expect(updateMeBodySchema.safeParse({ fullName: 'A' }).success).toBe(false);
    expect(updateMeBodySchema.safeParse({ fullName: 'x'.repeat(121) }).success).toBe(false);
    expect(updateMeBodySchema.safeParse({ fullName: 'Ana', role: 'admin' }).success).toBe(false);
  });

  it('changePasswordBodySchema: la nueva sigue las reglas del registro; la actual solo debe venir', async () => {
    const { changePasswordBodySchema } = await import('./index.js');
    expect(
      changePasswordBodySchema.safeParse({ currentPassword: 'x', newPassword: 'abcd1234' }).success,
    ).toBe(true);
    for (const bad of ['corta1', 'sololetras', '12345678']) {
      expect(
        changePasswordBodySchema.safeParse({ currentPassword: 'x', newPassword: bad }).success,
        bad,
      ).toBe(false);
    }
    expect(
      changePasswordBodySchema.safeParse({ currentPassword: '', newPassword: 'abcd1234' }).success,
    ).toBe(false);
  });

  it('deleteAccountBodySchema pide la contraseña', async () => {
    const { deleteAccountBodySchema } = await import('./index.js');
    expect(deleteAccountBodySchema.safeParse({ password: 'x' }).success).toBe(true);
    expect(deleteAccountBodySchema.safeParse({ password: '' }).success).toBe(false);
    expect(deleteAccountBodySchema.safeParse({}).success).toBe(false);
  });
});

describe('ruleResultSchema acepta el message null del motor', () => {
  it('con null, omitido o texto; y trae parts', async () => {
    const { ruleResultSchema } = await import('./index.js');
    const base = { code: 'RC-01', status: 'ok' };
    expect(ruleResultSchema.safeParse({ ...base, message: null, parts: [] }).success).toBe(true);
    expect(ruleResultSchema.safeParse(base).success).toBe(true);
    expect(
      ruleResultSchema.safeParse({
        ...base,
        status: 'fail',
        message: 'Sockets distintos',
        parts: ['cpu'],
      }).success,
    ).toBe(true);
  });
});
