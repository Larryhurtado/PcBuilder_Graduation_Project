import { describe, expect, it } from 'vitest';
import { createWhere, escapeLike, normSql, normValue } from './sql.js';

describe('createWhere', () => {
  it('numera los marcadores en el orden en que se agregan', () => {
    const where = createWhere();
    where.add('a = ?', 1);
    where.add('b BETWEEN ? AND ?', 2, 3);
    expect(where.toSql()).toBe('WHERE a = $1 AND b BETWEEN $2 AND $3');
    expect(where.params).toEqual([1, 2, 3]);
  });

  it('sin condiciones devuelve una cadena vacía', () => {
    expect(createWhere().toSql()).toBe('');
  });

  it('param agrega un valor suelto y devuelve su marcador', () => {
    const where = createWhere();
    where.add('a = ?', 'x');
    expect(where.param(20)).toBe('$2');
    expect(where.params).toEqual(['x', 20]);
  });

  it('falla si los marcadores y los valores no coinciden', () => {
    expect(() => createWhere().add('a = ? AND b = ?', 1)).toThrow(/2 marcadores y 1 valores/);
  });

  it('el valor del usuario nunca entra en el texto SQL', () => {
    const where = createWhere();
    where.add('name = ?', "'; DROP TABLE x; --");
    expect(where.toSql()).not.toContain('DROP');
  });
});

describe('escapeLike / normValue / normSql', () => {
  it('escapa los comodines de ILIKE', () => {
    expect(escapeLike('50%_\\')).toBe('50\\%\\_\\\\');
  });

  it('normValue ignora mayúsculas, espacios, guiones y guiones bajos', () => {
    expect(normValue('Micro ATX')).toBe(normValue('micro-atx'));
    expect(normValue('LGA 1700')).toBe('lga1700');
    expect(normValue('LGA_1700')).toBe('lga1700');
  });

  it('normSql genera la expresión equivalente', () => {
    expect(normSql('a.socket')).toBe("lower(regexp_replace(a.socket::text, '[\\s_-]', '', 'g'))");
  });
});
