import { describe, expect, it } from 'vitest';
import { STATUS, constraintsFor, evaluateCandidate, slotForCategory } from './index.js';
import * as f from './fixtures.js';

describe('slotForCategory', () => {
  it('la caja ocupa la ranura pcCase y lanza error con una categoría desconocida', () => {
    expect(slotForCategory('case')).toBe('pcCase');
    expect(slotForCategory('gpu')).toBe('gpu');
    expect(() => slotForCategory('monitor')).toThrow(/Categoría desconocida/);
  });
});

describe('constraintsFor (HU-06)', () => {
  it('CP-06: con una CPU Ryzen 5 7600 elegida, las placas deben ser socket AM5', () => {
    expect(constraintsFor('motherboard', { cpu: f.cpuRyzen5_7600 })).toEqual({ socket: 'AM5' });
  });

  it('placa: socket de la CPU, tipo de RAM elegido y formatos que admite la caja', () => {
    expect(
      constraintsFor('motherboard', {
        cpu: f.cpuRyzen5_7600,
        ram: f.ramDdr5_32,
        pcCase: f.case4000d,
      }),
    ).toEqual({
      socket: 'AM5',
      ram_type: 'DDR5',
      form_factor: ['ATX', 'Micro ATX', 'Mini-ITX', 'EATX'],
    });
  });

  it('CPU: el socket de la placa; con un disipador también, el cruce de ambos', () => {
    expect(constraintsFor('cpu', { motherboard: f.mbB650mPro })).toEqual({ socket: 'AM5' });
    const cooler = { ...f.coolerAk400, sockets: ['AM4', 'AM5', 'LGA 1700'] };
    expect(constraintsFor('cpu', { motherboard: f.mbB650mPro, cooler })).toEqual({ socket: 'AM5' });
    expect(constraintsFor('cpu', { cooler })).toEqual({ socket: ['AM4', 'AM5', 'LGA 1700'] });
  });

  it('CPU: si la placa y el disipador no tienen socket en común, la lista queda vacía', () => {
    const cooler = { ...f.coolerAk400, sockets: ['LGA 1700'] };
    expect(constraintsFor('cpu', { motherboard: f.mbB650mPro, cooler })).toEqual({ socket: [] });
  });

  it('RAM: el tipo de la placa; con una CPU que soporta ambos, manda la placa', () => {
    expect(constraintsFor('ram', { motherboard: f.mbB650mPro })).toEqual({ ram_type: 'DDR5' });
    expect(constraintsFor('ram', { motherboard: f.mbH610iMini, cpu: f.cpuI5_12400f })).toEqual({
      ram_type: 'DDR4',
    });
    expect(constraintsFor('ram', { cpu: f.cpuI5_12400f })).toEqual({ ram_type: ['DDR5', 'DDR4'] });
  });

  it('disipador: socket de la CPU y altura máxima de la caja (si se conoce)', () => {
    expect(constraintsFor('cooler', { cpu: f.cpuRyzen5_7600, pcCase: f.case4000d })).toEqual({
      cooler_socket: 'AM5',
      max_height_mm: 170,
    });
    expect(constraintsFor('cooler', { cpu: f.cpuRyzen5_7600, pcCase: f.caseH510Unknown })).toEqual({
      cooler_socket: 'AM5',
    });
  });

  it('GPU: longitud máxima de la caja', () => {
    expect(constraintsFor('gpu', { pcCase: f.caseNr200p })).toEqual({ max_length_mm: 330 });
  });

  it('caja: formato de la placa y medidas mínimas de GPU y disipador', () => {
    expect(
      constraintsFor('case', {
        motherboard: f.mbB650mPro,
        gpu: f.gpuRtx4060Ti,
        cooler: f.coolerAk400,
      }),
    ).toEqual({
      supports_form_factor: 'Micro ATX',
      min_gpu_length_mm: 338,
      min_cooler_height_mm: 155,
    });
  });

  it('fuente: potencia mínima = consumo estimado × 1,25, redondeada hacia arriba', () => {
    expect(constraintsFor('psu', { cpu: f.cpuRyzen5_7600, gpu: f.gpuRtx4060Ti })).toEqual({
      min_wattage_w: 375,
    });
    expect(constraintsFor('psu', { cpu: f.cpuRyzen7_7800x3d, gpu: f.gpuRtx4070Super })).toEqual({
      min_wattage_w: 519,
    });
  });

  it('sin piezas elegidas no hay restricciones (la fuente tampoco)', () => {
    for (const category of [
      'motherboard',
      'cpu',
      'ram',
      'cooler',
      'gpu',
      'case',
      'psu',
      'storage',
    ]) {
      expect(constraintsFor(category, {}), category).toEqual({});
    }
  });

  it('el almacenamiento no tiene restricciones y una categoría desconocida falla', () => {
    expect(constraintsFor('storage', f.buildA)).toEqual({});
    expect(() => constraintsFor('monitor', {})).toThrow();
  });
});

describe('evaluateCandidate (selector "+ Elegir componente")', () => {
  const withCpu = { cpu: f.cpuRyzen5_7600 };

  it('una placa AM5 encaja con una CPU AM5 y una AM4 no', () => {
    expect(evaluateCandidate('motherboard', f.mbB650mPro, withCpu).status).toBe(STATUS.OK);
    const bad = evaluateCandidate('motherboard', f.mbB550, withCpu);
    expect(bad.status).toBe(STATUS.FAIL);
    expect(bad.results.map((r) => r.code)).toContain('RC-01');
  });

  it('solo mira las reglas que involucran a la candidata: un conflicto previo no la descarta', () => {
    // El armado ya tiene RAM DDR4 con placa DDR5 (RC-02 en fail); una GPU nueva no hereda ese conflicto.
    const conflicted = { motherboard: f.mbB650mPro, ram: f.ramDdr4_16, pcCase: f.case4000d };
    expect(evaluateCandidate('gpu', f.gpuRtx4060Ti, conflicted).status).toBe(STATUS.OK);
  });

  it('una pieza con dato faltante da "unknown", no se oculta ni se marca compatible', () => {
    const noLength = { ...f.gpuRtx4060Ti, lengthMm: null };
    const r = evaluateCandidate('gpu', noLength, { pcCase: f.case4000d });
    expect(r.status).toBe(STATUS.UNKNOWN);
  });

  it('una GPU demasiado larga para la caja es "fail"', () => {
    expect(evaluateCandidate('gpu', f.gpuRtx4060Ti, { pcCase: f.caseNr200p }).status).toBe(
      STATUS.FAIL,
    );
  });

  it('una fuente se evalúa contra el consumo del armado (RC-08)', () => {
    const build = { cpu: f.cpuRyzen7_7800x3d, gpu: f.gpuRtx4070Super };
    expect(evaluateCandidate('psu', f.psuCv650, build).status).toBe(STATUS.OK);
    expect(evaluateCandidate('psu', { ...f.psuCv650, wattageW: 450 }, build).status).toBe(
      STATUS.FAIL,
    );
  });

  it('una CPU nueva puede dejar corta a la fuente ya elegida', () => {
    const build = { gpu: f.gpuRtx4070Super, psu: { ...f.psuCv650, wattageW: 450 } };
    expect(evaluateCandidate('cpu', f.cpuRyzen7_7800x3d, build).status).toBe(STATUS.FAIL);
  });

  it('sin piezas relacionadas todo candidato es "ok"; el almacenamiento siempre', () => {
    expect(evaluateCandidate('motherboard', f.mbB550, {}).status).toBe(STATUS.OK);
    expect(evaluateCandidate('storage', f.storageNv3, f.buildA).status).toBe(STATUS.OK);
  });

  it('reemplaza la pieza de la misma ranura en vez de sumarla ("Cambiar")', () => {
    const r = evaluateCandidate('cpu', f.cpuRyzen5_7600, {
      cpu: f.cpuRyzen5_5600,
      motherboard: f.mbB650mPro,
    });
    expect(r.status).toBe(STATUS.OK); // con la CPU AM4 anterior habría fallado RC-01
  });

  it('el armado original no se modifica', () => {
    const build = { cpu: f.cpuRyzen5_7600 };
    evaluateCandidate('motherboard', f.mbB550, build);
    expect(build).toEqual({ cpu: f.cpuRyzen5_7600 });
  });
});

describe('evaluateCandidate con una caja candidata (regresión: la caja siempre daba "ok")', () => {
  // Las reglas nombran la pieza 'case' y la ranura del armado es 'pcCase'.
  it('una caja que no admite la GPU elegida es "fail" por RC-05', () => {
    const r = evaluateCandidate('case', f.caseNr200p, { gpu: f.gpuRtx4060Ti });
    expect(r.status).toBe(STATUS.FAIL);
    expect(r.results.map((x) => x.code)).toContain('RC-05');
  });

  it('una caja que no admite el formato de la placa elegida es "fail" por RC-04', () => {
    const r = evaluateCandidate('case', f.caseNr200p, { motherboard: f.mbB650mPro });
    expect(r.status).toBe(STATUS.FAIL);
    expect(r.results.map((x) => x.code)).toContain('RC-04');
  });

  it('una caja más baja que el disipador elegido es "fail" por RC-06', () => {
    const r = evaluateCandidate('case', f.caseNr200p, { cooler: f.coolerAk400 });
    expect(r.status).toBe(STATUS.FAIL);
    expect(r.results.map((x) => x.code)).toContain('RC-06');
  });

  it('una caja sin la altura máxima de disipador es "unknown", no "ok"', () => {
    const r = evaluateCandidate('case', f.caseH510Unknown, { cooler: f.coolerAk400 });
    expect(r.status).toBe(STATUS.UNKNOWN);
  });

  it('una caja que sí encaja con todo lo elegido es "ok" y solo trae reglas de la caja', () => {
    const build = { motherboard: f.mbB650mPro, gpu: f.gpuRtx4060Ti, cooler: f.coolerAk400 };
    const r = evaluateCandidate('case', f.case4000d, build);
    expect(r.status).toBe(STATUS.OK);
    expect(r.results.map((x) => x.code).sort()).toEqual(['RC-04', 'RC-05', 'RC-06']);
    expect(r.results.every((x) => x.parts.includes('case'))).toBe(true);
  });

  it('cambiar una caja ya elegida por otra evalúa la nueva, no la anterior', () => {
    const build = { gpu: f.gpuRtx4060Ti, pcCase: f.case4000d };
    expect(evaluateCandidate('case', f.caseNr200p, build).status).toBe(STATUS.FAIL);
  });

  it('el resto de categorías sigue igual: la ranura y la categoría coinciden', () => {
    for (const category of ['cpu', 'motherboard', 'ram', 'gpu', 'psu', 'cooler', 'storage']) {
      expect(slotForCategory(category)).toBe(category);
    }
  });
});
