/**
 * Resultados posibles de una regla (Diseño Integral, sección 5.2).
 * La gravedad (error o advertencia) la agrega `evaluate` a partir de la regla.
 */
export const STATUS = Object.freeze({
  OK: 'ok',
  FAIL: 'fail',
  UNKNOWN: 'unknown',
  NOT_APPLICABLE: 'not_applicable',
});

/** Se tienen ambos datos y la condición se cumple. */
export const ok = (code, parts = []) => ({ code, status: STATUS.OK, parts, message: null });

/** Se tienen ambos datos y la condición NO se cumple. */
export const fail = (code, parts, message) => ({ code, status: STATUS.FAIL, parts, message });

/** Falta un dato en la Base Maestra: nunca se debe mostrar como compatible (ADR-04). */
export const unknown = (code, parts, message) => ({
  code,
  status: STATUS.UNKNOWN,
  parts,
  message,
});

/** Todavía no se eligió alguna de las piezas implicadas. */
export const notApplicable = (code) => ({
  code,
  status: STATUS.NOT_APPLICABLE,
  parts: [],
  message: null,
});
