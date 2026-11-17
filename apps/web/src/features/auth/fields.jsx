import { useState } from 'react';
import Icon from '../../shared/ui/Icon.jsx';

const inputClass =
  'h-12 w-full rounded-xl border bg-surface pl-11 pr-3 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-3';
const okBorder =
  'border-outline-variant focus:border-primary-container focus:ring-primary-container/25';
const badBorder = 'border-incompatible focus:border-incompatible focus:ring-incompatible/25';

/** Etiqueta + control + mensaje de error de un campo (el error se enlaza con `aria-describedby`). */
export function Field({ id, label, error, action, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-space-sm">
        <label htmlFor={id} className="text-label-md text-on-surface">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1 text-body-sm text-incompatible">
          <Icon name="error" className="mt-0.5 text-[16px]" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Campo de texto con icono, para usar con react-hook-form (`registration` es lo que devuelve
 * `register('campo')`).
 * @param {{ id: string, label: string, icon: string, error?: import('react').ReactNode, action?: import('react').ReactNode, registration: object, describedBy?: string } & import('react').InputHTMLAttributes<HTMLInputElement>} props
 */
export function TextField({
  id,
  label,
  icon,
  error,
  action,
  registration,
  describedBy,
  ...inputProps
}) {
  const described = [error ? `${id}-error` : null, describedBy].filter(Boolean).join(' ');
  return (
    <Field id={id} label={label} error={error} action={action}>
      <div className="relative">
        <Icon
          name={icon}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
        />
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={described || undefined}
          className={`${inputClass} ${error ? badBorder : okBorder}`}
          {...inputProps}
          {...registration}
        />
      </div>
    </Field>
  );
}

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function PasswordField({
  id = 'password',
  label = 'Contraseña',
  toggleName = 'contraseña',
  error,
  action,
  registration,
  describedBy,
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);
  const described = [error ? `${id}-error` : null, describedBy].filter(Boolean).join(' ');
  return (
    <Field id={id} label={label} error={error} action={action}>
      <div className="relative">
        <Icon
          name="lock"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
        />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={described || undefined}
          className={`${inputClass} pr-12 ${error ? badBorder : okBorder}`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${toggleName}`}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-outline transition-colors hover:text-on-surface"
        >
          <Icon name={visible ? 'visibility_off' : 'visibility'} className="text-[20px]" />
        </button>
      </div>
    </Field>
  );
}

/** Aviso de error del servidor sobre el botón de envío. */
export function FormAlert({ children }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-space-xs rounded-xl bg-[color-mix(in_srgb,var(--color-incompatible)_10%,var(--color-surface-container))] p-space-sm text-body-sm text-on-surface"
    >
      <Icon name="error" className="mt-0.5 text-[18px] text-incompatible" />
      <span>{children}</span>
    </p>
  );
}

/** Botón principal de envío con estado de carga. */
export function SubmitButton({ busy, busyLabel, children, icon = 'arrow_forward' }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {busy ? (
        busyLabel
      ) : (
        <>
          {children}
          <Icon name={icon} className="text-[18px]" />
        </>
      )}
    </button>
  );
}
