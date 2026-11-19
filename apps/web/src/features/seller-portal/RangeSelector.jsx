import { RANGES } from './ranges.js';

/**
 * Selector del rango de fechas del portal (7 días, 30 días, este mes). Lo comparten el dashboard y
 * las métricas.
 * @param {{ kind: string, onChange: (kind: string) => void, className?: string }} props
 */
export default function RangeSelector({ kind, onChange, className = '' }) {
  return (
    <div
      role="group"
      aria-label="Rango de fechas"
      className={`inline-flex rounded-xl bg-surface-container p-1 ${className}`}
    >
      {RANGES.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={kind === value}
          onClick={() => onChange(value)}
          className="min-h-11 rounded-lg px-4 text-label-md text-on-surface-variant transition-colors hover:text-on-surface aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
