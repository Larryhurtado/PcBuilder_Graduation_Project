import { describe, expect, it } from 'vitest';
import { findOffer } from '../../mocks/data.js';
import { analyzeBuild, candidateStatus, loadLevel, lowerFirst, toEngineBuild } from './analysis.js';

const tecno = 'TecnoPasarela Cali';

// Armado A del Diseño (CP-01): todo compatible
const compatible = () => ({
  cpu: findOffer('AMD Ryzen 5 7600', tecno),
  motherboard: findOffer('MSI PRO B650M-P'),
  ram: findOffer('DDR5-6200'),
  gpu: findOffer('RTX 4060 Ti'),
  psu: findOffer('Corsair RM750'),
  case: findOffer('Corsair 4000D'),
  cooler: findOffer('AK400'),
  storage: findOffer('Kingston NV3'),
});

describe('toEngineBuild', () => {
  it('le pasa al motor las especificaciones por ranura y la caja como pcCase', () => {
    const build = toEngineBuild({
      case: findOffer('Corsair 4000D'),
      cpu: findOffer('AMD Ryzen 5 7600', tecno),
    });
    expect(Object.keys(build).sort()).toEqual(['cpu', 'pcCase']);
    expect(build.cpu.socket).toBe('AM5');
  });
});

describe('analyzeBuild', () => {
  it('un armado vacío no tiene reglas, consumo ni carga', () => {
    const analysis = analyzeBuild({});
    expect(analysis).toMatchObject({ count: 0, total: 0, estimatedWatts: 0, load: null });
    expect(analysis.results).toEqual([]);
  });

  it('CP-01: todo compatible, 300 W y fuente recomendada de 400 W', () => {
    const analysis = analyzeBuild(compatible());
    expect(analysis.summary).toMatchObject({ incompatible: 0, unknown: 0 });
    expect(analysis.summary.ok).toBeGreaterThanOrEqual(7);
    expect(analysis.estimatedWatts).toBe(300);
    expect(analysis.recommendedPsuW).toBe(400);
    expect(analysis.load).toEqual({ percent: 40, level: 'ok', watts: 750 });
    expect(analysis.bySlot.gpu.status).toBe('ok');
  });

  it('suma los precios y cuenta las piezas', () => {
    const parts = {
      cpu: findOffer('AMD Ryzen 5 7600', tecno), // 849.000
      ram: findOffer('DDR5-6200'), // 469.000
    };
    expect(analyzeBuild(parts)).toMatchObject({ count: 2, total: 1318000 });
  });

  it('una GPU que no cabe en la caja es un conflicto en las dos piezas (RC-05)', () => {
    const analysis = analyzeBuild({ gpu: findOffer('RTX 4060 Ti'), case: findOffer('NR200P') });
    expect(analysis.failures).toHaveLength(1);
    expect(analysis.failures[0]).toMatchObject({ code: 'RC-05' });
    expect(analysis.failures[0].message).toBe('La GPU mide 338 mm y la caja admite 330 mm');
    expect(analysis.bySlot.gpu.status).toBe('fail');
    expect(analysis.bySlot.case.status).toBe('fail');
  });

  it('CP-02 y CP-03: socket y tipo de RAM distintos son incompatibles', () => {
    const analysis = analyzeBuild({
      cpu: findOffer('Ryzen 5 5600'), // AM4
      motherboard: findOffer('MSI PRO B650M-P'), // AM5, DDR5
      ram: findOffer('Kingston HyperX'), // DDR4
    });
    expect(analysis.failures.map((f) => f.code).sort()).toEqual(['RC-01', 'RC-02']);
  });

  it('CP-05: un dato faltante es "no verificable", nunca compatible', () => {
    const analysis = analyzeBuild({ case: findOffer('NZXT H510'), cooler: findOffer('AK400') });
    expect(analysis.unknowns.map((u) => u.code)).toEqual(['RC-06']);
    expect(analysis.bySlot.case.status).toBe('unknown');
    expect(analysis.bySlot.cooler.status).toBe('unknown');
    expect(analysis.summary.ok).toBe(0);
  });

  it('una pieza sin reglas aplicables queda sin estado', () => {
    const analysis = analyzeBuild({ storage: findOffer('Kingston NV3') });
    expect(analysis.bySlot.storage.status).toBe('none');
  });
});

describe('loadLevel', () => {
  it.each([
    [40, 'ok'],
    [80, 'ok'],
    [80.1, 'warn'],
    [100, 'warn'],
    [100.1, 'danger'],
  ])('%s %% de carga es %s', (percent, level) => {
    expect(loadLevel(percent)).toBe(level);
  });

  it('con una CPU y una GPU más potentes la carga de la fuente sube', () => {
    const analysis = analyzeBuild({
      cpu: findOffer('Ryzen 7 7800X3D'), // 120 W
      gpu: findOffer('RTX 4070 SUPER'), // 220 W
      psu: findOffer('Corsair RM750'), // 750 W
    });
    expect(analysis.estimatedWatts).toBe(415); // 120 + 220 + 75
    expect(analysis.load).toEqual({ percent: 55.3, level: 'ok', watts: 750 });
  });
});

describe('candidateStatus', () => {
  const gpuParts = { gpu: findOffer('RTX 4060 Ti') };

  it('detecta una caja que no admite la GPU elegida (el motor no lo hace con la caja)', () => {
    const nr200p = findOffer('NR200P').component.specs;
    expect(candidateStatus('case', nr200p, gpuParts).status).toBe('fail');
  });

  it('acepta una caja con espacio y marca como no verificable la de datos incompletos', () => {
    const parts = { ...gpuParts, cooler: findOffer('AK400') };
    expect(candidateStatus('case', findOffer('Corsair 4000D').component.specs, parts).status).toBe(
      'ok',
    );
    expect(candidateStatus('case', findOffer('NZXT H510').component.specs, parts).status).toBe(
      'unknown',
    );
  });

  it('una categoría sin reglas aplicables queda en "none"', () => {
    expect(
      candidateStatus('storage', findOffer('Kingston NV3').component.specs, gpuParts).status,
    ).toBe('none');
  });
});

describe('lowerFirst', () => {
  it('baja la primera letra', () => {
    expect(lowerFirst('Falta el socket')).toBe('falta el socket');
  });
});
