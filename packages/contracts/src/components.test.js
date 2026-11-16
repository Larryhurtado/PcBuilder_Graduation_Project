import { describe, expect, it } from 'vitest';
import {
  componentCategories,
  componentSchema,
  componentSearchResponseSchema,
  specsSchemaByCategory,
} from './index.js';

const base = {
  id: '6b03b443-7b22-491c-b301-7e2a285359df',
  brand: 'AMD',
  model: '7600',
  displayName: 'AMD Ryzen 5 7600',
  releaseYear: 2023,
  version: 1,
  updatedAt: '2026-11-16T12:00:00.000Z',
  source: { name: 'BuildCores OpenDB', license: 'CC BY-NC-SA 4.0', attributionText: 'Data from…' },
};

const cpu = {
  ...base,
  category: 'cpu',
  specs: {
    socket: 'AM5',
    tdpW: 65,
    cores: 6,
    threads: 12,
    baseClockGhz: 3.8,
    boostClockGhz: 5.1,
    memoryTypes: ['DDR5'],
    hasIntegratedGraphics: true,
  },
};

describe('componentSchema', () => {
  it('hay un esquema de especificaciones por cada categoría', () => {
    expect(Object.keys(specsSchemaByCategory).sort()).toEqual([...componentCategories].sort());
  });

  it('acepta una CPU completa', () => {
    expect(componentSchema.safeParse(cpu).success).toBe(true);
  });

  it('acepta datos desconocidos como null (no verificable)', () => {
    const gpu = {
      ...base,
      category: 'gpu',
      specs: {
        tdpW: 160,
        lengthMm: null,
        slotWidth: null,
        interface: null,
        memoryGb: null,
        powerConnectors: null,
      },
    };
    expect(componentSchema.safeParse(gpu).success).toBe(true);
  });

  it('rechaza especificaciones de otra categoría', () => {
    const wrong = { ...cpu, category: 'gpu' };
    expect(componentSchema.safeParse(wrong).success).toBe(false);
  });

  it('rechaza campos extra en specs (evita filtrar columnas internas)', () => {
    const extra = { ...cpu, specs: { ...cpu.specs, componentId: 'x' } };
    expect(componentSchema.safeParse(extra).success).toBe(false);
  });

  it('rechaza un dato obligatorio como null', () => {
    const bad = { ...cpu, specs: { ...cpu.specs, tdpW: null } };
    expect(componentSchema.safeParse(bad).success).toBe(false);
  });
});

describe('componentSearchResponseSchema', () => {
  it('acepta resultados con y sin precio', () => {
    const body = {
      items: [
        {
          id: base.id,
          category: 'cpu',
          brand: 'AMD',
          model: '7600',
          displayName: 'AMD Ryzen 5 7600',
          minPriceCop: 849000,
          offersCount: 2,
        },
        {
          id: base.id,
          category: 'cpu',
          brand: 'AMD',
          model: '5600',
          displayName: 'AMD Ryzen 5 5600',
          minPriceCop: null,
          offersCount: 0,
        },
      ],
    };
    expect(componentSearchResponseSchema.safeParse(body).success).toBe(true);
  });
});
