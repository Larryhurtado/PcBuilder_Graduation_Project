// Matriz de casos compatibles e incompatibles (insumo del informe de pruebas del objetivo 4).
// Cada fila es un armado con el estado esperado de cada regla. Se usa como evidencia de:
//   % de casos compatibles identificados  y  % de casos incompatibles rechazados.
import { describe, expect, it } from 'vitest';
import { STATUS, evaluate } from './index.js';
import * as f from './fixtures.js';

const { OK, FAIL, UNKNOWN } = STATUS;

/** [nombre, armado, { regla: estado esperado }] (las reglas que no aparecen deben ser "no aplica"). */
const cases = [
  [
    'M-01 AM5 completo (armado A)',
    f.buildA,
    {
      'RC-01': OK,
      'RC-02': OK,
      'RC-03': OK,
      'RC-04': OK,
      'RC-05': OK,
      'RC-06': OK,
      'RC-07': OK,
      'RC-08': OK,
    },
  ],
  [
    'M-02 Intel LGA 1700 DDR4 compatible',
    {
      cpu: f.cpuI5_12400f,
      motherboard: f.mbB760mDdr4,
      ram: f.ramDdr4_64,
      pcCase: f.case4000d,
      psu: f.psuCv650,
    },
    { 'RC-01': OK, 'RC-02': OK, 'RC-03': OK, 'RC-04': OK, 'RC-08': OK },
  ],
  [
    'M-03 Intel LGA 1700 con placa Mini-ITX en caja Mini-ITX',
    { cpu: f.cpuI5_12400f, motherboard: f.mbH610iMini, pcCase: f.caseNr200p },
    { 'RC-01': OK, 'RC-04': OK },
  ],
  [
    'M-04 AM4 completo con DDR4',
    {
      cpu: f.cpuRyzen5_5600,
      motherboard: f.mbB550,
      ram: f.ramDdr4_16,
      gpu: f.gpuRx7600,
      psu: f.psuCv650,
      pcCase: f.case4000d,
      cooler: f.coolerAk400,
    },
    {
      'RC-01': OK,
      'RC-02': OK,
      'RC-03': OK,
      'RC-04': OK,
      'RC-05': OK,
      'RC-06': OK,
      'RC-07': OK,
      'RC-08': OK,
    },
  ],
  [
    'M-05 Ryzen 7 7800X3D + RTX 4070 SUPER con fuente de 650 W',
    { cpu: f.cpuRyzen7_7800x3d, gpu: f.gpuRtx4070Super, psu: f.psuCv650 },
    { 'RC-08': OK },
  ],
  ['M-06 Armado vacío', {}, {}],

  [
    'X-01 Socket AM4 con placa AM5',
    { cpu: f.cpuRyzen5_5600, motherboard: f.mbB650mPro },
    { 'RC-01': FAIL },
  ],
  [
    'X-02 Socket AM5 con placa LGA 1700',
    { cpu: f.cpuRyzen5_7600, motherboard: f.mbB760mDdr4 },
    { 'RC-01': FAIL },
  ],
  [
    'X-03 DDR4 en placa DDR5',
    { ram: f.ramDdr4_16, motherboard: f.mbB650mPro },
    { 'RC-02': FAIL, 'RC-03': OK },
  ],
  [
    'X-04 DDR5 en placa DDR4',
    { ram: f.ramDdr5_32, motherboard: f.mbB550 },
    { 'RC-02': FAIL, 'RC-03': OK },
  ],
  [
    'X-05 Cuatro módulos en placa de dos ranuras',
    { ram: { ...f.ramDdr4_16, modulesQty: 4 }, motherboard: f.mbH610iMini },
    { 'RC-02': OK, 'RC-03': FAIL },
  ],
  [
    'X-06 128 GB en placa de máximo 64 GB',
    { ram: { ...f.ramDdr4_64, capacityGb: 128 }, motherboard: f.mbH610iMini },
    { 'RC-02': OK, 'RC-03': FAIL },
  ],
  [
    'X-07 Placa Micro ATX en caja solo Mini-ITX',
    { motherboard: f.mbB650mPro, pcCase: f.caseNr200p },
    { 'RC-04': FAIL },
  ],
  [
    'X-08 Placa ATX en caja solo Mini-ITX',
    { motherboard: f.mbB550, pcCase: f.caseNr200p },
    { 'RC-04': FAIL },
  ],
  [
    'X-09 RTX 4060 Ti (338 mm) en caja de 330 mm',
    { gpu: f.gpuRtx4060Ti, pcCase: f.caseNr200p },
    { 'RC-05': FAIL },
  ],
  [
    'X-10 Disipador de 155 mm en caja de 153 mm',
    { cooler: f.coolerAk400, pcCase: f.caseNr200p },
    { 'RC-06': FAIL },
  ],
  [
    'X-11 Disipador sin soporte para AM5',
    { cpu: f.cpuRyzen5_7600, cooler: { ...f.coolerAk400, sockets: ['AM4'] } },
    { 'RC-07': FAIL },
  ],
  [
    'X-12 Fuente de 450 W para 415 W estimados',
    { cpu: f.cpuRyzen7_7800x3d, gpu: f.gpuRtx4070Super, psu: { ...f.psuCv650, wattageW: 450 } },
    { 'RC-08': FAIL },
  ],
  [
    'X-13 Fuente de 374 W para 300 W estimados (límite inferior)',
    { cpu: f.cpuRyzen5_7600, gpu: f.gpuRtx4060Ti, psu: { ...f.psuRm750, wattageW: 374 } },
    { 'RC-08': FAIL },
  ],
  [
    'X-14 Armado B: tres conflictos a la vez',
    f.buildB,
    { 'RC-01': FAIL, 'RC-02': FAIL, 'RC-03': OK, 'RC-04': FAIL },
  ],

  [
    'N-01 Caja sin altura máxima de disipador',
    { cooler: f.coolerAk400, pcCase: f.caseH510Unknown },
    { 'RC-06': UNKNOWN },
  ],
  [
    'N-02 GPU sin longitud',
    { gpu: { ...f.gpuRtx4060Ti, lengthMm: null }, pcCase: f.case4000d },
    { 'RC-05': UNKNOWN },
  ],
  [
    'N-03 Placa sin capacidad máxima de RAM',
    { ram: f.ramDdr5_32, motherboard: { ...f.mbB650mPro, ramMaxGb: null } },
    { 'RC-02': OK, 'RC-03': UNKNOWN },
  ],
  [
    'N-04 Disipador sin lista de sockets',
    { cpu: f.cpuRyzen5_7600, cooler: { ...f.coolerAk400, sockets: [] } },
    { 'RC-07': UNKNOWN },
  ],
  [
    'N-05 Un dato faltante y un conflicto real a la vez',
    {
      cooler: f.coolerAk400,
      pcCase: { ...f.caseH510Unknown, maxGpuLengthMm: 200 },
      gpu: f.gpuRtx4060Ti,
    },
    { 'RC-05': FAIL, 'RC-06': UNKNOWN },
  ],
];

describe('matriz de casos compatibles, incompatibles y no verificables', () => {
  it.each(cases)('%s', (_name, build, expected) => {
    const { results } = evaluate(build);
    for (const result of results) {
      expect(result.status, `${result.code}`).toBe(expected[result.code] ?? STATUS.NOT_APPLICABLE);
    }
  });

  it('resumen de la matriz: todos los casos compatibles se identifican y todos los incompatibles se rechazan', () => {
    const outcome = cases.map(([name, build]) => {
      const { summary } = evaluate(build);
      return { kind: name[0], incompatible: summary.incompatible, unknown: summary.unknown };
    });
    const compatible = outcome.filter((o) => o.kind === 'M');
    const incompatible = outcome.filter((o) => o.kind === 'X');
    const notVerifiable = outcome.filter((o) => o.kind === 'N');

    expect(compatible.every((o) => o.incompatible === 0 && o.unknown === 0)).toBe(true);
    expect(incompatible.every((o) => o.incompatible >= 1)).toBe(true);
    expect(notVerifiable.every((o) => o.unknown >= 1)).toBe(true);
    expect(compatible).toHaveLength(6);
    expect(incompatible).toHaveLength(14);
    expect(notVerifiable).toHaveLength(5);
  });
});
