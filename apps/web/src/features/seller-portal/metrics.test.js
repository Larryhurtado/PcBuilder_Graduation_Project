import { describe, expect, it } from 'vitest';
import {
  bestAndWorstDay,
  clickRate,
  csvFilename,
  dailyCsv,
  rateChange,
  summarizeDays,
  weekdayPattern,
} from './metrics.js';

const day = (date, views, whatsappClicks) => ({ day: date, views, whatsappClicks });

// Del lunes 2026-11-02 al domingo 2026-11-08
const week = [
  day('2026-11-02', 100, 10),
  day('2026-11-03', 120, 6),
  day('2026-11-04', 0, 0),
  day('2026-11-05', 80, 20),
  day('2026-11-06', 90, 9),
  day('2026-11-07', 150, 15),
  day('2026-11-08', 60, 0),
];

describe('clickRate', () => {
  it('es clics sobre visitas en porcentaje', () => {
    expect(clickRate(10, 100)).toBe(10);
    expect(clickRate(1, 3)).toBeCloseTo(33.33, 1);
  });

  it('sin visitas no hay tasa (null, nunca cero ni infinito)', () => {
    expect(clickRate(0, 0)).toBeNull();
    expect(clickRate(5, 0)).toBeNull();
  });
});

describe('summarizeDays', () => {
  it('suma visitas y clics y calcula tasa y promedio diario', () => {
    expect(summarizeDays(week)).toEqual({
      views: 600,
      clicks: 60,
      rate: 10,
      averageClicks: 60 / 7,
      days: 7,
    });
  });

  it('un rango vacío no inventa promedios', () => {
    expect(summarizeDays([])).toEqual({
      views: 0,
      clicks: 0,
      rate: null,
      averageClicks: null,
      days: 0,
    });
  });
});

describe('rateChange', () => {
  it('da la diferencia en puntos porcentuales', () => {
    expect(rateChange(12, 10)).toBe(2);
    expect(rateChange(8, 10)).toBe(-2);
  });

  it('sin una de las dos tasas no hay comparación', () => {
    expect(rateChange(null, 10)).toBeNull();
    expect(rateChange(10, null)).toBeNull();
  });
});

describe('bestAndWorstDay', () => {
  it('encuentra el día con más y con menos clics', () => {
    const { best, worst } = bestAndWorstDay(week);
    expect(best.day).toBe('2026-11-05');
    // Dos días en cero: gana el más antiguo
    expect(worst.day).toBe('2026-11-04');
  });

  it('sin ningún clic no hay mejor ni peor día', () => {
    expect(bestAndWorstDay([day('2026-11-02', 10, 0), day('2026-11-03', 5, 0)])).toEqual({
      best: null,
      worst: null,
    });
    expect(bestAndWorstDay([])).toEqual({ best: null, worst: null });
  });

  it('en un empate gana el día más antiguo', () => {
    const { best } = bestAndWorstDay([day('2026-11-02', 10, 5), day('2026-11-03', 10, 5)]);
    expect(best.day).toBe('2026-11-02');
  });
});

describe('weekdayPattern', () => {
  it('va de lunes a domingo con los clics de cada día', () => {
    const rows = weekdayPattern(week);
    expect(rows.map((row) => row.short)).toEqual(['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']);
    expect(rows.map((row) => row.clicks)).toEqual([10, 6, 0, 20, 9, 15, 0]);
    expect(rows[0]).toMatchObject({ name: 'lunes', occurrences: 1, average: 10 });
  });

  it('promedia los días de la semana que se repiten', () => {
    // Dos lunes: 2026-11-02 (10 clics) y 2026-11-09 (30 clics)
    const rows = weekdayPattern([day('2026-11-02', 100, 10), day('2026-11-09', 100, 30)]);
    expect(rows[0]).toMatchObject({ occurrences: 2, clicks: 40, average: 20 });
  });

  it('un día de la semana que no está en el rango queda en null, no en cero', () => {
    const rows = weekdayPattern([day('2026-11-02', 100, 10)]);
    expect(rows[1].average).toBeNull();
    expect(rows[1].occurrences).toBe(0);
  });
});

describe('dailyCsv', () => {
  it('lleva encabezado, un renglón por día y los totales', () => {
    const lines = dailyCsv(week.slice(0, 2)).replace('﻿', '').trim().split('\r\n');
    expect(lines).toEqual([
      'Fecha;Visitas;Clics a WhatsApp;Tasa de clic (%)',
      '2026-11-02;100;10;10,0',
      '2026-11-03;120;6;5,0',
      'Total;220;16;7,3',
    ]);
  });

  it('un día sin visitas deja la tasa vacía', () => {
    expect(dailyCsv([day('2026-11-04', 0, 0)])).toContain('2026-11-04;0;0;\r\n');
  });

  it('empieza con BOM para que Excel lea los acentos', () => {
    expect(dailyCsv(week).startsWith('﻿')).toBe(true);
  });
});

describe('csvFilename', () => {
  it('incluye el rango', () => {
    expect(csvFilename({ from: '2026-11-02', to: '2026-11-08' })).toBe(
      'metricas-2026-11-02_a_2026-11-08.csv',
    );
  });
});
