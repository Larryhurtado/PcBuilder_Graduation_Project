import { describe, expect, it } from 'vitest';
import { categoryLabels, specHighlight, specLine, specPills } from './specs.js';

describe('specPills', () => {
  const cpu = {
    socket: 'AM5',
    tdpW: 120,
    cores: 8,
    threads: 16,
    baseClockGhz: 4.2,
    boostClockGhz: 5,
    memoryTypes: ['DDR5'],
    hasIntegratedGraphics: true,
  };

  it('resume una CPU con TDP, memoria y gráficos', () => {
    expect(specPills('cpu', cpu)).toEqual(['TDP 120 W', 'DDR5', 'Gráficos integrados']);
    expect(specPills('cpu', { ...cpu, hasIntegratedGraphics: false })[2]).toBe('Requiere GPU');
  });

  it('nunca pasa de tres etiquetas y omite los datos desconocidos', () => {
    const gpu = {
      tdpW: 220,
      lengthMm: null,
      slotWidth: 2,
      interface: 'PCIe 4.0',
      memoryGb: 12,
      powerConnectors: null,
    };
    expect(specPills('gpu', gpu)).toEqual(['TDP 220 W', '12 GB']);
    expect(
      specPills('case', { formFactor: 'ATX', maxGpuLengthMm: 360, maxCoolerHeightMm: 170 }),
    ).toHaveLength(3);
    expect(specPills('cpu', { ...cpu, hasIntegratedGraphics: null, memoryTypes: null })).toEqual([
      'TDP 120 W',
    ]);
  });

  it('cubre fuente, cooler, memoria, placa y almacenamiento', () => {
    expect(
      specPills('psu', {
        wattageW: 750,
        formFactor: 'ATX',
        efficiencyRating: '80+ Gold',
        modular: 'Full',
      }),
    ).toEqual(['80+ Gold', 'Full', 'ATX']);
    expect(specPills('cooler', { heightMm: 155, waterCooled: false, radiatorMm: null })).toEqual([
      'Altura 155 mm',
      'Aire',
    ]);
    expect(specPills('ram', { capacityGb: 32, speedMhz: 6200, casLatency: 32 })).toEqual([
      '32 GB',
      '6200 MHz',
      'CL32',
    ]);
    expect(specPills('motherboard', { formFactor: 'ATX', ramType: 'DDR5', m2Slots: 2 })).toEqual([
      'ATX',
      'DDR5',
      '2 M.2',
    ]);
    expect(
      specPills('storage', { storageType: 'SSD', interface: 'NVMe', capacityGb: 1000 }),
    ).toEqual(['SSD', 'NVMe', '1 TB']);
  });

  it('sin especificaciones o con una categoría desconocida no hay etiquetas', () => {
    expect(specPills('cpu', null)).toEqual([]);
    expect(specPills('monitor', {})).toEqual([]);
  });
});

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
