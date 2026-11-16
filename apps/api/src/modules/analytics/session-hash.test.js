import { describe, expect, it } from 'vitest';
import { createSessionHasher } from './session-hash.js';

const at = (iso) => () => new Date(iso);
const SECRET = 'un-secreto-de-prueba-largo';

describe('createSessionHasher', () => {
  it('devuelve un hexadecimal de 64 caracteres (encaja en char(64))', () => {
    const hash = createSessionHasher({ secret: SECRET })('203.0.113.7', 'Mozilla/5.0');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('es estable: la misma IP, agente y día dan el mismo hash', () => {
    const hasher = createSessionHasher({ secret: SECRET, now: at('2026-11-16T15:00:00Z') });
    expect(hasher('203.0.113.7', 'Firefox')).toBe(hasher('203.0.113.7', 'Firefox'));
  });

  it('cambia con la IP y con el agente de usuario', () => {
    const hasher = createSessionHasher({ secret: SECRET });
    const base = hasher('203.0.113.7', 'Firefox');
    expect(hasher('203.0.113.8', 'Firefox')).not.toBe(base);
    expect(hasher('203.0.113.7', 'Chrome')).not.toBe(base);
  });

  it('la sal cambia cada día en hora de Colombia: el hash no sirve para seguir a alguien', () => {
    const day1 = createSessionHasher({ secret: SECRET, now: at('2026-11-16T15:00:00Z') });
    const day2 = createSessionHasher({ secret: SECRET, now: at('2026-11-17T15:00:00Z') });
    expect(day1('203.0.113.7', 'Firefox')).not.toBe(day2('203.0.113.7', 'Firefox'));
  });

  it('el cambio de día es a medianoche de Colombia (UTC-5), no de UTC', () => {
    // 23:30 del 16 en Bogotá = 04:30 UTC del 17; 00:30 del 17 en Bogotá = 05:30 UTC del 17
    const before = createSessionHasher({ secret: SECRET, now: at('2026-11-17T04:30:00Z') });
    const sameDay = createSessionHasher({ secret: SECRET, now: at('2026-11-16T16:00:00Z') });
    const after = createSessionHasher({ secret: SECRET, now: at('2026-11-17T05:30:00Z') });
    expect(before('1.1.1.1', 'x')).toBe(sameDay('1.1.1.1', 'x'));
    expect(after('1.1.1.1', 'x')).not.toBe(before('1.1.1.1', 'x'));
  });

  it('con otro secreto el hash es distinto', () => {
    const a = createSessionHasher({ secret: 'secreto-aaaaaaaaaaaa' });
    const b = createSessionHasher({ secret: 'secreto-bbbbbbbbbbbb' });
    expect(a('1.1.1.1', 'x')).not.toBe(b('1.1.1.1', 'x'));
  });

  it('el hash no contiene la IP ni el agente de usuario', () => {
    const hash = createSessionHasher({ secret: SECRET })('203.0.113.7', 'Mozilla/5.0');
    expect(hash).not.toContain('203');
    expect(hash).not.toContain('Mozilla');
  });

  it('funciona sin IP ni agente (valores ausentes)', () => {
    expect(createSessionHasher({ secret: SECRET })(undefined, undefined)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('sin secreto genera uno aleatorio por instancia', () => {
    const a = createSessionHasher()('1.1.1.1', 'x');
    const b = createSessionHasher()('1.1.1.1', 'x');
    expect(a).not.toBe(b);
  });
});
