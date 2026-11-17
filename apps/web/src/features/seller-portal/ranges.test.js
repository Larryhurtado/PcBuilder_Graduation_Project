import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysIn,
  fillDays,
  longDay,
  percentChange,
  previousRange,
  rangeFor,
  shortDay,
  todayInColombia,
} from './ranges.js';

describe('todayInColombia', () => {
  it('usa la fecha de Colombia (UTC−5), no la del navegador', () => {
    // 03:00 UTC del 17 es todavía las 22:00 del 16 en Bogotá
    expect(todayInColombia(new Date('2026-11-17T03:00:00Z'))).toBe('2026-11-16');
    expect(todayInColombia(new Date('2026-11-17T06:00:00Z'))).toBe('2026-11-17');
  });
});

describe('addDays y daysIn', () => {
  it('suma y resta días cruzando meses y años', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-11-16', 0)).toBe('2026-11-16');
  });

  it('cuenta ambos extremos del rango', () => {
    expect(daysIn({ from: '2026-11-10', to: '2026-11-16' })).toBe(7);
    expect(daysIn({ from: '2026-11-16', to: '2026-11-16' })).toBe(1);
  });
});

describe('rangeFor', () => {
  it('7 días y 30 días terminan hoy', () => {
    expect(rangeFor('7d', '2026-11-16')).toEqual({ from: '2026-11-10', to: '2026-11-16' });
    expect(rangeFor('30d', '2026-11-16')).toEqual({ from: '2026-10-18', to: '2026-11-16' });
  });

  it('"este mes" va desde el día 1 hasta hoy', () => {
    expect(rangeFor('month', '2026-11-16')).toEqual({ from: '2026-11-01', to: '2026-11-16' });
    expect(rangeFor('month', '2026-12-01')).toEqual({ from: '2026-12-01', to: '2026-12-01' });
  });

  it('un valor desconocido cae en los últimos 7 días', () => {
    expect(rangeFor('otro', '2026-11-16')).toEqual(rangeFor('7d', '2026-11-16'));
  });
});

describe('previousRange', () => {
  it('es el periodo inmediatamente anterior y de la misma duración', () => {
    expect(previousRange({ from: '2026-11-10', to: '2026-11-16' })).toEqual({
      from: '2026-11-03',
      to: '2026-11-09',
    });
    const month = previousRange({ from: '2026-11-01', to: '2026-11-16' });
    expect(daysIn(month)).toBe(16);
    expect(month.to).toBe('2026-10-31');
  });
});

describe('fillDays', () => {
  it('devuelve un registro por día y deja en cero los que la API no trae', () => {
    const days = fillDays({ from: '2026-11-10', to: '2026-11-13' }, [
      { day: '2026-11-11', views: 50, whatsappClicks: 5 },
      { day: '2026-11-13', views: 20, whatsappClicks: 2 },
    ]);
    expect(days).toEqual([
      { day: '2026-11-10', views: 0, whatsappClicks: 0 },
      { day: '2026-11-11', views: 50, whatsappClicks: 5 },
      { day: '2026-11-12', views: 0, whatsappClicks: 0 },
      { day: '2026-11-13', views: 20, whatsappClicks: 2 },
    ]);
  });
});

describe('percentChange', () => {
  it('calcula el cambio contra el periodo anterior', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(100, 100)).toBe(0);
  });

  it('sin periodo anterior con qué comparar devuelve null', () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe('shortDay y longDay', () => {
  it('muestran el día de la semana en español sin correrse por la zona horaria', () => {
    expect(shortDay('2026-11-16')).toBe('lun 16');
    expect(longDay('2026-11-16')).toMatch(/lunes,? 16 de noviembre/);
  });
});
