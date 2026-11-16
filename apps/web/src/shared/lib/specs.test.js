import { describe, expect, it } from 'vitest';
import { categoryLabels, specHighlight, specLine } from './specs.js';

const cpu = {
  socket: 'AM5',
  tdpW: 65,
  cores: 6,
  threads: 12,
  baseClockGhz: 3.8,
  boostClockGhz: 5.1,
  memoryTypes: ['DDR5'],
  hasIntegratedGraphics: true,
};

describe('specLine', () => {
  it('resume una CPU', () => {
    expect(specLine('cpu', cpu)).toBe('AM5 • 3.8/5.1 GHz • 6 núcleos');
  });

  it('no muestra los datos null (no verificables) como cero', () => {
    const line = specLine('cpu', { ...cpu, baseClockGhz: null, cores: null });
    expect(line).toBe('AM5');
    expect(line).not.toContain('0');
  });

  it('resume memoria RAM, GPU, almacenamiento y fuente', () => {
    expect(
      specLine('ram', {
        ramType: 'DDR5',
        speedMhz: 6000,
        modulesQty: 2,
        capacityGb: 32,
        formFactor: 'DIMM',
        casLatency: 30,
      }),
    ).toBe('DDR5-6000 • 2×16 GB • CL30');
    expect(
      specLine('gpu', {
        tdpW: 220,
        lengthMm: null,
        slotWidth: 2,
        interface: 'PCIe 4.0',
        memoryGb: 12,
        powerConnectors: null,
      }),
    ).toBe('12 GB • PCIe 4.0');
    expect(
      specLine('storage', {
        storageType: 'SSD',
        interface: 'NVMe',
        capacityGb: 2000,
        formFactor: 'M.2',
      }),
    ).toBe('SSD • NVMe • 2 TB');
    expect(
      specLine('storage', {
        storageType: 'SSD',
        interface: 'SATA',
        capacityGb: 500,
        formFactor: null,
      }),
    ).toContain('500 GB');
    expect(
      specLine('psu', {
        wattageW: 750,
        formFactor: null,
        efficiencyRating: '80+ Gold',
        modular: 'Full',
        connectors: null,
      }),
    ).toBe('750 W • 80+ Gold • Full');
  });

  it('devuelve texto vacío sin especificaciones o con una categoría desconocida', () => {
    expect(specLine('cpu', null)).toBe('');
    expect(specLine('monitor', {})).toBe('');
  });
});

describe('specHighlight', () => {
  it('destaca el dato clave de cada categoría', () => {
    expect(specHighlight('cpu', cpu)).toBe('Socket AM5');
    expect(specHighlight('motherboard', { socket: 'AM5', ramType: 'DDR5' })).toBe(
      'Socket AM5 • DDR5',
    );
    expect(specHighlight('gpu', { tdpW: 160 })).toBe('160 W de consumo');
    expect(specHighlight('case', { supportedMbFormFactors: ['ATX', 'Micro ATX'] })).toBe(
      'ATX, Micro ATX',
    );
    expect(specHighlight('cooler', { sockets: ['AM5', 'AM4', 'LGA1700', 'LGA1200'] })).toBe(
      'AM5, AM4, LGA1700',
    );
  });

  it('devuelve vacío si falta el dato', () => {
    expect(specHighlight('gpu', { tdpW: null })).toBe('');
    expect(specHighlight('cpu', undefined)).toBe('');
  });
});

describe('categoryLabels', () => {
  it('cubre las 8 categorías del MVP', () => {
    expect(Object.keys(categoryLabels).sort()).toEqual([
      'case',
      'cooler',
      'cpu',
      'gpu',
      'motherboard',
      'psu',
      'ram',
      'storage',
    ]);
  });
});
