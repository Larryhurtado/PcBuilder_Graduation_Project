import { Link } from 'react-router';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import Icon from '../../shared/ui/Icon.jsx';

const inputClass =
  'h-12 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-md text-on-surface disabled:cursor-not-allowed disabled:opacity-70';

function Section({ id, icon, title, description, soon = true, children }) {
  return (
    <section
      aria-labelledby={id}
      className="space-y-space-md rounded-2xl bg-surface-container p-space-md md:p-space-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <div className="space-y-1">
          <h2 id={id} className="flex items-center gap-2 text-headline-sm text-on-surface">
            <Icon name={icon} className="text-[22px] text-primary" />
            {title}
          </h2>
          <p className="max-w-xl text-body-sm text-on-surface-variant">{description}</p>
        </div>
        {soon && (
          <span className="rounded-full bg-surface px-3 py-1 text-label-sm text-on-surface-variant">
            Edición próximamente
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({ id, label, hint, tag, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-space-sm">
        <label htmlFor={id} className="text-label-md text-on-surface">
          {label}
        </label>
        {tag && (
          <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-outline">
            {tag}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-body-sm text-outline">{hint}</p>}
    </div>
  );
}

/**
 * Datos de la cuenta. Hoy la API solo permite leerlos (GET /me): la edición se ve deshabilitada
 * hasta que exista PATCH /me.
 * @param {{ user: { email: string, fullName: string } }} props
 */
export function ProfileSection({ user }) {
  return (
    <Section
      id="datos-perfil"
      icon="badge"
      title="Datos del perfil"
      description="Información de tu cuenta. Tu nombre aparece en los armados que guardes y compartas."
    >
      <fieldset disabled className="space-y-space-md">
        <legend className="sr-only">Datos del perfil (edición próximamente)</legend>
        <div className="grid gap-space-md md:grid-cols-2">
          <Field id="perfil-nombre" label="Nombre y apellido">
            <input id="perfil-nombre" className={inputClass} defaultValue={user.fullName} />
          </Field>
          <Field id="perfil-correo" label="Correo electrónico" tag="Solo lectura">
            <input
              id="perfil-correo"
              type="email"
              className={inputClass}
              defaultValue={user.email}
            />
          </Field>
        </div>
        <Field
          id="perfil-ciudad"
          label="Ciudad preferida"
          hint="Para priorizar las tiendas de tu ciudad en los resultados."
        >
          <select id="perfil-ciudad" className={inputClass} defaultValue="">
            <option value="">Selecciona tu ciudad</option>
          </select>
        </Field>
        <div className="flex items-start justify-between gap-space-md rounded-xl bg-surface p-space-sm">
          <div>
            <label htmlFor="perfil-alertas" className="text-label-md text-on-surface">
              Alertas de precio
            </label>
            <p className="text-body-sm text-on-surface-variant">
              Recibe un aviso cuando baje el precio de las piezas que guardaste.
            </p>
          </div>
          <input
            id="perfil-alertas"
            type="checkbox"
            role="switch"
            className="mt-1 h-5 w-9 shrink-0 cursor-not-allowed accent-primary-container opacity-70"
          />
        </div>
      </fieldset>
      <div className="flex justify-end">
        <ComingSoonButton
          icon="save"
          label="Guardar cambios"
          className="h-14 border border-outline-variant px-5 text-on-surface"
        />
      </div>
    </Section>
  );
}

/** Cambio de contraseña. Se ve deshabilitado hasta que exista POST /me/password. */
export function SecuritySection() {
  return (
    <Section
      id="seguridad"
      icon="key"
      title="Seguridad"
      description="Cambia la contraseña con la que ingresas a tu cuenta."
    >
      <fieldset disabled className="space-y-space-md">
        <legend className="sr-only">Cambio de contraseña (próximamente)</legend>
        <Field id="seguridad-actual" label="Contraseña actual">
          <input
            id="seguridad-actual"
            type="password"
            autoComplete="current-password"
            className={inputClass}
          />
        </Field>
        <div className="grid gap-space-md md:grid-cols-2">
          <Field id="seguridad-nueva" label="Nueva contraseña">
            <input
              id="seguridad-nueva"
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
          <Field id="seguridad-confirmar" label="Confirmar nueva contraseña">
            <input
              id="seguridad-confirmar"
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
        </div>
        <p className="text-body-sm text-outline">
          Entre 8 y 72 caracteres, con al menos una letra y un número.
        </p>
      </fieldset>
      <div className="flex justify-end">
        <ComingSoonButton
          icon="lock_reset"
          label="Actualizar contraseña"
          className="h-14 border border-outline-variant px-5 text-on-surface"
        />
      </div>
    </Section>
  );
}

/** Eliminación de la cuenta. Se ve deshabilitada hasta que exista DELETE /me. */
export function DangerZone() {
  return (
    <section
      aria-labelledby="zona-critica"
      className="space-y-space-md rounded-2xl border border-incompatible/40 bg-[color-mix(in_srgb,var(--color-incompatible)_8%,var(--color-surface-container))] p-space-md md:p-space-lg"
    >
      <div className="space-y-1">
        <h2
          id="zona-critica"
          className="flex items-center gap-2 text-headline-sm text-incompatible"
        >
          <Icon name="warning" className="text-[22px]" />
          Eliminar cuenta
        </h2>
        <p className="max-w-2xl text-body-sm text-on-surface-variant">
          Podrás pedir la eliminación de tu cuenta y de tus datos personales (Ley 1581 de 2012).
          Esta acción no se podrá deshacer. Consulta la{' '}
          <Link to="/privacidad" className="text-primary underline">
            Política de Privacidad
          </Link>
          .
        </p>
      </div>
      <ComingSoonButton
        icon="delete"
        label="Eliminar mi cuenta"
        className="h-14 border border-incompatible px-5 text-incompatible"
      />
    </section>
  );
}
