import { describe, expect, it } from 'vitest';
import { homeForRole, safeNext } from './redirect.js';

describe('safeNext', () => {
  it('acepta rutas internas con su consulta', () => {
    expect(safeNext('/cuenta')).toBe('/cuenta');
    expect(safeNext('/catalogo?category=cpu&q=ryzen')).toBe('/catalogo?category=cpu&q=ryzen');
  });

  it.each([
    'https://malo.com',
    '//malo.com',
    '/\\malo.com',
    'cuenta',
    '',
    null,
    undefined,
    '/ingresar',
    '/ingresar?next=/cuenta',
    '/a\nb',
  ])('rechaza %j', (value) => {
    expect(safeNext(value)).toBeNull();
  });
});

describe('homeForRole', () => {
  it('lleva al vendedor a su panel y al resto al inicio', () => {
    expect(homeForRole('seller')).toBe('/vendedor');
    expect(homeForRole('buyer')).toBe('/');
    expect(homeForRole('admin')).toBe('/');
  });
});
