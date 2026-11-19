import { verificationStatusValues } from '@hw/contracts';
import { describeVerification } from './verification.js';

/**
 * TEMPORAL, solo para desarrollo: barra para ver cómo se muestra cada estado de verificación sin
 * tocar la API. Solo existe con `VITE_USE_MOCKS=true` y solo cambia lo que muestra esta pantalla.
 * Se borra cuando haya backend real.
 * @param {{ value: string | null, onChange: (status: string | null) => void }} props
 */
export default function VerificationSimulator({ value, onChange }) {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return null;

  return (
    <div className="space-y-space-xs rounded-2xl border border-dashed border-outline-variant p-space-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-outline">
        Solo desarrollo · temporal · simula el estado de esta pantalla
      </p>
      <div
        role="group"
        aria-label="Simular estado de verificación"
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={`min-h-11 rounded-xl border px-3 text-label-md transition-colors ${
            value === null
              ? 'border-primary bg-primary-container text-on-primary-container'
              : 'border-outline-variant text-on-surface hover:bg-surface-variant'
          }`}
        >
          Estado real
        </button>
        {verificationStatusValues.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={value === status}
            onClick={() => onChange(status)}
            className={`min-h-11 rounded-xl border px-3 text-label-md transition-colors ${
              value === status
                ? 'border-primary bg-primary-container text-on-primary-container'
                : 'border-outline-variant text-on-surface hover:bg-surface-variant'
            }`}
          >
            {status === 'not_submitted' ? 'Sin enviar' : describeVerification({ status }).chip}
          </button>
        ))}
      </div>
    </div>
  );
}
