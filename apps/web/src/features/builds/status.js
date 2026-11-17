/** Estado de un armado a partir de su evaluación: conflicto > por confirmar > compatible. */
export function buildStatus(evaluation) {
  if (evaluation.summary.incompatible > 0) return 'fail';
  if (evaluation.summary.unknown > 0) return 'unknown';
  return 'ok';
}

export const STATUS_VIEW = {
  ok: { icon: 'check_circle', label: 'Compatible', filter: 'Compatibles', tone: 'text-compatible' },
  unknown: {
    icon: 'warning',
    label: 'Con advertencias',
    filter: 'Con advertencias',
    tone: 'text-unverifiable',
  },
  fail: {
    icon: 'error',
    label: 'Incompatibilidad detectada',
    filter: 'Incompatibles',
    tone: 'text-incompatible',
  },
};
