import { describe, expect, it } from 'vitest';
import {
  formatCOP,
  formatCOPAmount,
  formatDate,
  formatLocation,
  formatWarranty,
} from './format.js';

describe('formatDate', () => {
  it('escribe la fecha larga en español, sin correrse de día por la zona horaria', () => {
    expect(formatDate('2026-10-12T00:00:00.000Z')).toBe('12 de octubre de 2026');
  });

  it('devuelve null si no es una fecha válida', () => {
    expect(formatDate('no-es-fecha')).toBeNull();
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
  });
});

describe('formatWarranty', () => {
  it('dice la garantía en meses, con singular y sin garantía', () => {
    expect(formatWarranty(12)).toBe('Garantía 12 meses');
    expect(formatWarranty(1)).toBe('Garantía 1 mes');
    expect(formatWarranty(0)).toBe('Sin garantía');
  });

  it('un dato inválido se trata como sin garantía, no como cero meses de garantía', () => {
    expect(formatWarranty(null)).toBe('Sin garantía');
    expect(formatWarranty(undefined)).toBe('Sin garantía');
    expect(formatWarranty(Number.NaN)).toBe('Sin garantía');
  });
});

describe('formatCOPAmount', () => {
  it('agrupa los miles con punto y sin decimales', () => {
    expect(formatCOPAmount(1849000)).toBe('1.849.000');
    expect(formatCOPAmount(489000)).toBe('489.000');
    expect(formatCOPAmount(999)).toBe('999');
    expect(formatCOPAmount(0)).toBe('0');
  });

  it('redondea los decimales y respeta el signo', () => {
    expect(formatCOPAmount(1234.6)).toBe('1.235');
    expect(formatCOPAmount(-2500000)).toBe('-2.500.000');
  });

  it('devuelve null si el valor no es un número finito', () => {
    expect(formatCOPAmount(Number.NaN)).toBeNull();
    expect(formatCOPAmount(Infinity)).toBeNull();
    expect(formatCOPAmount('1000')).toBeNull();
    expect(formatCOPAmount(null)).toBeNull();
    expect(formatCOPAmount(undefined)).toBeNull();
  });
});

describe('formatCOP', () => {
  it('usa el formato colombiano completo', () => {
    expect(formatCOP(1849000)).toBe('$ 1.849.000 COP');
    expect(formatCOP(3050000)).toBe('$ 3.050.000 COP');
  });

  it('no inventa precios: un valor inválido se muestra como raya', () => {
    expect(formatCOP(null)).toBe('—');
    expect(formatCOP(Number.NaN)).toBe('—');
  });
});

describe('formatLocation', () => {
  it('une ciudad y departamento', () => {
    expect(formatLocation({ city: 'Cali', department: 'Valle del Cauca' })).toBe(
      'Cali, Valle del Cauca',
    );
  });

  it('no repite la ciudad cuando el departamento ya la nombra', () => {
    expect(formatLocation({ city: 'Bogotá', department: 'Bogotá D.C.' })).toBe('Bogotá D.C.');
  });

  it('tolera datos faltantes', () => {
    expect(formatLocation({ city: 'Cali', department: null })).toBe('Cali');
    expect(formatLocation({ city: null, department: 'Antioquia' })).toBe('Antioquia');
    expect(formatLocation()).toBe('');
  });
});
