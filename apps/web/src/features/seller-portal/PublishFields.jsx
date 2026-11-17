import Icon from '../../shared/ui/Icon.jsx';

export const inputClass =
  'h-12 w-full rounded-xl border bg-surface px-3 text-body-md text-on-surface focus:outline-none focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60';
export const okBorder =
  'border-outline-variant focus:border-primary-container focus:ring-primary-container/25';
export const badBorder = 'border-incompatible focus:border-incompatible focus:ring-incompatible/25';

/** Campo con etiqueta, ayuda y mensaje de error enlazados al control por `id`. */
export function Field({ id, label, hint, error, badge, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-label-md text-on-surface">
          {label}
        </label>
        {badge && <span className="text-label-sm text-outline">{badge}</span>}
      </div>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-body-sm text-outline">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1 text-body-sm text-incompatible">
          <Icon name="error" className="mt-0.5 text-[16px]" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Atributos de accesibilidad de un control con error. */
export const invalid = (id, error) => ({
  'aria-invalid': Boolean(error),
  'aria-describedby': error ? `${id}-error` : undefined,
});

/** Pie de cada paso: "Paso anterior" y la acción principal. */
export function StepActions({ onBack, backLabel = 'Paso anterior', children }) {
  return (
    <div className="flex flex-col-reverse gap-space-sm border-t border-outline-variant/40 pt-space-md sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-5 text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      {children}
    </div>
  );
}

/** Botón principal (violeta) con flecha. */
export function PrimaryButton({ children, icon = 'arrow_forward', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
      <Icon name={icon} className="text-[18px]" />
    </button>
  );
}
