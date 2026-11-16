// Motor de compatibilidad: JavaScript puro, sin red, base de datos ni framework (ADR-02).
// Se ejecuta igual en el navegador y en el servidor.
//
// Un armado tiene una ranura por categoría con las especificaciones planas de la pieza:
//   { cpu, motherboard, ram, gpu, psu, pcCase, cooler, storage }   (todas opcionales)
export { STATUS, ok, fail, unknown, notApplicable } from './results.js';
export { defaultParams, resolveParams } from './params.js';
export { estimateWatts } from './power.js';
export { defaultRules, rc01, rc02, rc03, rc04, rc05, rc06, rc07, rc08 } from './rules.js';
export { evaluate, summarize } from './evaluate.js';
export { constraintsFor, evaluateCandidate, slotForCategory } from './constraints.js';
