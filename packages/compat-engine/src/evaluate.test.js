import { describe, expect, it } from 'vitest';
import { STATUS, evaluate, rc01, summarize } from './index.js';
import * as f from './fixtures.js';

const byCode = (evaluation, code) => evaluation.results.find((r) => r.code === code);

describe('evaluate: casos de aceptación del Diseño', () => {
  it('CP-01: el armado A es compatible, consume 300 W y recomienda una fuente de 400 W', () => {
    const e = evaluate(f.buildA);
    expect(e.results).toHaveLength(8);
    for (const r of e.results) expect(r.status, r.code).toBe(STATUS.OK);
    expect(e.summary).toEqual({ incompatible: 0, unknown: 0, ok: 8 });
    expect(e.estimatedWatts).toBe(300);
    expect(e.recommendedPsuW).toBe(400);
  });

  it('CP-02: Ryzen 5 5600 (AM4) con placa AM5 → RC-01 incompatible', () => {
    const e = evaluate({ cpu: f.cpuRyzen5_5600, motherboard: f.mbB650mPro });
    expect(byCode(e, 'RC-01')).toMatchObject({
      status: STATUS.FAIL,
      parts: ['cpu', 'motherboard'],
      message: 'La CPU usa el socket AM4 y la placa base es AM5',
    });
  });

  it('CP-03: memoria DDR4 con placa DDR5 → RC-02 incompatible', () => {
    const e = evaluate({ ram: f.ramDdr4_16, motherboard: f.mbB650mPro });
    expect(byCode(e, 'RC-02')).toMatchObject({
      status: STATUS.FAIL,
      message: 'La RAM es DDR4 y la placa base soporta DDR5',
    });
  });

  it('CP-04: placa Micro ATX en caja solo Mini-ITX → RC-04 incompatible', () => {
    const e = evaluate({ motherboard: f.mbB650mPro, pcCase: f.caseNr200p });
    expect(byCode(e, 'RC-04')).toMatchObject({
      status: STATUS.FAIL,
      message: 'La placa base es Micro ATX y la caja solo admite Mini-ITX',
    });
  });

  it('CP-05: caja sin altura de disipador → RC-06 no verificable (nunca "compatible")', () => {
    const e = evaluate({ cooler: f.coolerAk400, pcCase: f.caseH510Unknown });
    const rc06 = byCode(e, 'RC-06');
    expect(rc06.status).toBe(STATUS.UNKNOWN);
    expect(rc06.status).not.toBe(STATUS.OK);
    expect(rc06.message).toBe('Falta la altura máxima de disipador de la caja');
  });

  it('el armado B detecta RC-01, RC-02 y RC-04 y deja RC-03 en ok', () => {
    const e = evaluate(f.buildB);
    expect(e.summary).toEqual({ incompatible: 3, unknown: 0, ok: 1 });
    const failed = e.results.filter((r) => r.status === STATUS.FAIL).map((r) => r.code);
    expect(failed).toEqual(['RC-01', 'RC-02', 'RC-04']);
  });
});

describe('evaluate: estructura del resultado', () => {
  it('un armado vacío no tiene conflictos: todo es "no aplica" y consume 0 W', () => {
    const e = evaluate({});
    expect(e.results.every((r) => r.status === STATUS.NOT_APPLICABLE)).toBe(true);
    expect(e.summary).toEqual({ incompatible: 0, unknown: 0, ok: 0 });
    expect(e.estimatedWatts).toBe(0);
    expect(e.recommendedPsuW).toBe(0);
  });

  it('cada resultado trae código, estado, gravedad, piezas y mensaje', () => {
    const [first] = evaluate(f.buildB).results;
    expect(Object.keys(first).sort()).toEqual(['code', 'message', 'parts', 'severity', 'status']);
    expect(first.severity).toBe('error');
  });

  it('no mezcla piezas de otro armado (no modifica el objeto recibido)', () => {
    const build = structuredClone(f.buildA);
    evaluate(build);
    expect(build).toEqual(f.buildA);
  });

  it('una regla con enabled: false se omite', () => {
    const rules = [{ ...rc01, enabled: false }];
    expect(evaluate(f.buildB, undefined, rules).results).toEqual([]);
  });

  it('acepta parámetros con los nombres de la base de datos', () => {
    const e = evaluate(f.buildA, { base_system_watts: 100 });
    expect(e.estimatedWatts).toBe(325);
    expect(e.recommendedPsuW).toBe(450);
  });
});

describe('summarize', () => {
  it('cuenta incompatibles, no verificables y compatibles', () => {
    const summary = summarize([
      { status: 'fail' },
      { status: 'fail' },
      { status: 'unknown' },
      { status: 'ok' },
      { status: 'not_applicable' },
    ]);
    expect(summary).toEqual({ incompatible: 2, unknown: 1, ok: 1 });
  });
});
