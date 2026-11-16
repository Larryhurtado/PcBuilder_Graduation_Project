import { describe, expect, it } from 'vitest';
import {
  adaptScriptForPlatform,
  assertSafeDatabaseName,
  buildApproveStoreSql,
  isValidEmail,
  parseDatabaseUrl,
  quoteIdent,
  sortSqlFiles,
} from './db-lib.mjs';

describe('parseDatabaseUrl', () => {
  it('extrae usuario, clave, host, puerto y base', () => {
    expect(
      parseDatabaseUrl('postgres://postgres:secreto@localhost:5433/hardware_validator'),
    ).toEqual({
      host: 'localhost',
      port: '5433',
      user: 'postgres',
      password: 'secreto',
      database: 'hardware_validator',
    });
  });

  it('decodifica caracteres especiales de la clave', () => {
    const { password } = parseDatabaseUrl('postgres://u:p%40ss%23w@localhost/hardware_validator');
    expect(password).toBe('p@ss#w');
  });

  it('usa puerto 5432 por defecto', () => {
    expect(parseDatabaseUrl('postgres://u:p@localhost/hardware_validator').port).toBe('5432');
  });

  it('rechaza una URL inválida, otro protocolo o sin base', () => {
    expect(() => parseDatabaseUrl('no es una url')).toThrow(/formato/);
    expect(() => parseDatabaseUrl('mysql://u:p@localhost/x')).toThrow(/postgres/);
    expect(() => parseDatabaseUrl('postgres://u:p@localhost/')).toThrow(/nombre de la base/);
  });
});

describe('assertSafeDatabaseName', () => {
  it('acepta las bases del proyecto', () => {
    expect(() => assertSafeDatabaseName('hardware_validator')).not.toThrow();
    expect(() => assertSafeDatabaseName('hardware_validator_test')).not.toThrow();
  });

  it('rechaza cualquier otra base', () => {
    for (const name of [
      'postgres',
      'mi_proyecto',
      'hardware_validator2',
      'hardware_validator_',
      'HARDWARE_VALIDATOR',
    ]) {
      expect(() => assertSafeDatabaseName(name), name).toThrow(/Por seguridad/);
    }
  });
});

describe('sortSqlFiles', () => {
  it('ordena por nombre y descarta lo que no es .sql', () => {
    expect(sortSqlFiles(['006_b.sql', '.gitkeep', '001_a.sql', 'notas.md', '010_c.sql'])).toEqual([
      '001_a.sql',
      '006_b.sql',
      '010_c.sql',
    ]);
  });
});

describe('adaptScriptForPlatform', () => {
  const sql = '\\set ON_ERROR_STOP on\n\\o /dev/null\nSELECT 1;\n\\o\n';

  it('en Windows cambia /dev/null por NUL', () => {
    expect(adaptScriptForPlatform(sql, 'win32')).toContain('\\o NUL');
    expect(adaptScriptForPlatform(sql, 'win32')).not.toContain('/dev/null');
  });

  it('en Linux y macOS deja el script igual', () => {
    expect(adaptScriptForPlatform(sql, 'linux')).toBe(sql);
  });

  it('no toca el "\\o" que restablece la salida', () => {
    expect(adaptScriptForPlatform(sql, 'win32').endsWith('\\o\n')).toBe(true);
  });
});

describe('quoteIdent', () => {
  it('escapa comillas dobles', () => {
    expect(quoteIdent('a"b')).toBe('"a""b"');
  });
});

describe('approve-store', () => {
  it('acepta correos normales y rechaza texto que pueda romper el SQL', () => {
    expect(isValidEmail('ana@correo.co')).toBe(true);
    for (const bad of [
      undefined,
      '',
      'sin-arroba',
      "a'b@c.co",
      'a@b.co; DROP TABLE x',
      'a b@c.co',
    ]) {
      expect(isValidEmail(bad), String(bad)).toBe(false);
    }
  });

  it('el SQL aprueba la solicitud, verifica el comercio y conserva lo que el vendedor ya completó', () => {
    const sql = buildApproveStoreSql("'ana@correo.co'");
    expect(sql).toContain("status = 'approved'");
    expect(sql).toContain('is_verified = true');
    expect(sql).toContain("email = 'ana@correo.co'");
    for (const column of ['nit', 'whatsapp_e164', 'city', 'address']) {
      expect(sql).toContain(`${column} = COALESCE(${column},`);
    }
    expect(sql).toContain('reviewed_by');
    expect(sql).toContain('admin@demo.test');
  });
});
