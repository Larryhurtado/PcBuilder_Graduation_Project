import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { initials } from '../../shared/lib/format.js';
import { notify } from '../../shared/notices.js';
import { useSession } from '../../shared/session/useSession.js';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { LOCATIONS, OTHER_LOCATION, OTHER_LOCATION_LABEL } from '../seller/locations.js';
import { badBorder, Field, inputClass, invalid, okBorder } from './PublishFields.jsx';
import { useMyStore, useUpdateStore, useVerificationStatus } from './queries.js';
import {
  draftFromStore,
  identityLocked,
  missingForVerification,
  toPatch,
  validateDraft,
} from './settings.js';
import { describeVerification, TONES } from './verification.js';

const card = 'space-y-space-md rounded-2xl bg-surface-container p-space-md md:p-space-lg';

const SECTIONS = [
  ['perfil', 'storefront', 'Perfil comercial'],
  ['ubicacion', 'pin_drop', 'Ubicación'],
  ['whatsapp', 'chat', 'WhatsApp y horario'],
  ['inventario', 'tune', 'Preferencias de inventario'],
];

function SoonTag() {
  return (
    <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-outline">
      Próximamente
    </span>
  );
}

function SectionTitle({ id, icon, title, text }) {
  return (
    <div className="flex items-start gap-space-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
        <Icon name={icon} className="text-[22px]" />
      </span>
      <div className="space-y-0.5">
        <h2 id={id} className="text-headline-sm text-on-surface">
          {title}
        </h2>
        <p className="text-body-sm text-on-surface-variant">{text}</p>
      </div>
    </div>
  );
}

/** Interruptor de una preferencia que todavía no existe: se ve apagado y deshabilitado. */
function SoonSwitch({ label, text }) {
  return (
    <div className="flex items-start justify-between gap-space-sm rounded-2xl bg-surface p-space-md">
      <div className="space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-label-md text-on-surface">
          {label}
          <SoonTag />
        </p>
        <p className="text-body-sm text-on-surface-variant">{text}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked="false"
        aria-label={`${label} (próximamente)`}
        disabled
        className="flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-surface-variant p-0.5 opacity-60"
      >
        <span className="h-5 w-5 rounded-full bg-surface" />
      </button>
    </div>
  );
}

function SettingsForm({ store, verification }) {
  const { user } = useSession();
  const update = useUpdateStore(user?.id);
  const status = verification?.status;
  const lockedIdentity = identityLocked(status);
  const [draft, setDraft] = useState(() => draftFromStore(store));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  const patch = toPatch(draft, store, { lockedIdentity });
  const dirty = Object.keys(patch).length > 0;
  const missing = missingForVerification(store);
  const view = verification ? describeVerification(verification) : null;
  const style = (error) => `${inputClass} ${error ? badBorder : okBorder}`;

  const change = (next) => {
    setDraft((current) => ({ ...current, ...next }));
    setErrors({});
    setServerError(null);
  };

  const discard = () => {
    setDraft(draftFromStore(store));
    setErrors({});
    setServerError(null);
  };

  const save = (event) => {
    event.preventDefault();
    const found = validateDraft(draft, { lockedIdentity });
    setErrors(found);
    if (Object.keys(found).length > 0 || !dirty) return;
    setServerError(null);
    update.mutate(patch, {
      onSuccess: (saved) => {
        setDraft(draftFromStore(saved));
        notify({ message: 'Cambios guardados.' });
      },
      onError: (error) =>
        setServerError(error instanceof ApiError ? error.userMessage : getErrorMessage(error)),
    });
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-space-sm">
      <button
        type="button"
        onClick={discard}
        disabled={!dirty || update.isPending}
        className="min-h-12 rounded-xl px-5 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        Descartar
      </button>
      <button
        type="submit"
        disabled={!dirty || update.isPending}
        className="flex min-h-12 items-center gap-2 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Icon name="save" className="text-[18px]" />
        {update.isPending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );

  return (
    <form
      onSubmit={save}
      noValidate
      className="mx-auto w-full max-w-[85rem] space-y-space-lg p-space-md lg:p-space-lg"
    >
      <header className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
        <div className="space-y-space-xs">
          <p className="text-label-sm uppercase tracking-wider text-primary">Mi negocio</p>
          <div className="flex flex-wrap items-center gap-space-sm">
            <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
              Ajustes de tienda
            </h1>
            {view && (
              <Link
                to="/vendedor/verificacion"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-sm ${TONES[view.tone].chip}`}
              >
                <Icon name={TONES[view.tone].icon} className="text-[16px]" />
                {view.chip}
              </Link>
            )}
          </div>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            Perfil comercial, ubicación y canal de WhatsApp de tu negocio en {PLATFORM_NAME}.
          </p>
        </div>
        {actions}
      </header>

      <nav aria-label="Secciones" className="flex flex-wrap gap-space-xs">
        {SECTIONS.map(([id, icon, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
          >
            <Icon name={icon} className="text-[18px]" />
            {label}
          </a>
        ))}
        <button
          type="button"
          disabled
          title="Próximamente"
          className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl px-3 text-label-md text-on-surface-variant opacity-60"
        >
          <Icon name="shield" className="text-[18px]" />
          Seguridad y accesos · Próximamente
        </button>
      </nav>

      {missing.length > 0 && (
        <p
          role="note"
          className="flex items-start gap-space-sm rounded-2xl bg-[color-mix(in_srgb,var(--color-unverifiable)_10%,var(--color-surface-container))] p-space-md text-body-sm text-on-surface"
        >
          <Icon name="info" className="mt-0.5 text-[20px] text-unverifiable" />
          <span>
            Para verificar tu negocio todavía faltan estos datos: {missing.join(', ')}.{' '}
            <Link to="/vendedor/verificacion" className="text-primary underline">
              Ver estado de verificación
            </Link>
          </span>
        </p>
      )}

      <div className="grid gap-space-lg lg:grid-cols-2 lg:items-start">
        <div className="space-y-space-lg">
          <section aria-labelledby="perfil" className={card}>
            <SectionTitle
              id="perfil"
              icon="badge"
              title="Ficha pública comercial"
              text="Cómo te ven los compradores en el catálogo y en las cotizaciones."
            />

            <div className="flex flex-wrap items-center gap-space-md rounded-2xl bg-surface p-space-md">
              <span
                aria-hidden="true"
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-surface-container text-headline-sm text-primary"
              >
                {initials(store.tradeName)}
              </span>
              <div className="space-y-1">
                <p className="text-label-md text-on-surface">Logotipo</p>
                <button
                  type="button"
                  disabled
                  title="Próximamente"
                  className="flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface-variant opacity-70"
                >
                  <Icon name="upload" className="text-[18px]" />
                  Cambiar logo · Próximamente
                </button>
              </div>
            </div>

            <Field id="aj-nombre" label="Nombre comercial" error={errors.tradeName}>
              <input
                id="aj-nombre"
                value={draft.tradeName}
                onChange={(event) => change({ tradeName: event.target.value })}
                autoComplete="organization"
                className={style(errors.tradeName)}
                {...invalid('aj-nombre', errors.tradeName)}
              />
            </Field>

            <div className="grid gap-space-md sm:grid-cols-2">
              <Field id="aj-razon" label="Razón social" error={errors.legalName}>
                <input
                  id="aj-razon"
                  value={draft.legalName}
                  disabled={lockedIdentity}
                  onChange={(event) => change({ legalName: event.target.value })}
                  className={style(errors.legalName)}
                  {...invalid('aj-razon', errors.legalName)}
                />
              </Field>
              <Field id="aj-nit" label="NIT" error={errors.nit}>
                <input
                  id="aj-nit"
                  value={draft.nit}
                  disabled={lockedIdentity}
                  placeholder="900234567-8"
                  onChange={(event) => change({ nit: event.target.value })}
                  className={`tnum ${style(errors.nit)}`}
                  {...invalid('aj-nit', errors.nit)}
                />
              </Field>
            </div>
            {lockedIdentity && (
              <p className="flex items-start gap-1 text-body-sm text-outline">
                <Icon name="lock" className="mt-0.5 text-[16px]" />
                La razón social y el NIT no se pueden cambiar con la verificación en curso o
                aprobada. Para cambiarlos, contacta a soporte.
              </p>
            )}

            <Field
              id="aj-descripcion"
              label="Descripción"
              error={errors.description}
              hint={`${draft.description.length} de 1000 caracteres`}
            >
              <textarea
                id="aj-descripcion"
                rows={4}
                value={draft.description}
                onChange={(event) => change({ description: event.target.value })}
                className={`w-full rounded-xl border bg-surface p-3 text-body-md text-on-surface focus:outline-none focus:ring-3 ${errors.description ? badBorder : okBorder}`}
                {...invalid('aj-descripcion', errors.description)}
              />
            </Field>
          </section>

          <section aria-labelledby="whatsapp" className={card}>
            <SectionTitle
              id="whatsapp"
              icon="chat"
              title="Canal directo de WhatsApp"
              text="A este número llegan los clientes que cotizan contigo."
            />
            <Field
              id="aj-whatsapp"
              label="Línea móvil de cotizaciones"
              error={errors.whatsapp}
              hint="Celular colombiano: 10 dígitos que empiezan en 3."
            >
              <div className="flex gap-space-xs">
                <span className="flex h-12 shrink-0 items-center rounded-xl border border-outline-variant bg-surface px-3 text-body-md text-on-surface-variant">
                  +57
                </span>
                <input
                  id="aj-whatsapp"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={draft.whatsapp}
                  onChange={(event) => change({ whatsapp: event.target.value })}
                  className={`tnum ${style(errors.whatsapp)}`}
                  {...invalid('aj-whatsapp', errors.whatsapp)}
                />
              </div>
            </Field>
            <Field
              id="aj-plantilla"
              label="Plantilla del mensaje de WhatsApp"
              badge="Próximamente"
              hint="Por ahora el mensaje lo arma la plataforma con el componente y el precio."
            >
              <textarea
                id="aj-plantilla"
                rows={3}
                disabled
                placeholder="Hola, armé mi cotización en la plataforma con {componente} ({precio})…"
                className="w-full rounded-xl border border-outline-variant bg-surface p-3 text-body-md text-on-surface opacity-60"
              />
            </Field>
            <div className="flex items-center justify-between gap-space-sm rounded-2xl bg-surface p-space-md">
              <div className="space-y-0.5">
                <p className="flex flex-wrap items-center gap-2 text-label-md text-on-surface">
                  Horario de atención
                  <SoonTag />
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Podrás indicar los días y las horas en que respondes.
                </p>
              </div>
              <button
                type="button"
                disabled
                title="Próximamente"
                className="min-h-11 shrink-0 cursor-not-allowed rounded-xl border border-outline-variant px-4 text-label-md text-on-surface-variant opacity-70"
              >
                Editar horario
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-space-lg">
          <section aria-labelledby="ubicacion" className={card}>
            <SectionTitle
              id="ubicacion"
              icon="pin_drop"
              title="Ubicación de despacho"
              text="Punto de retiro físico para los compradores."
            />

            <Field id="aj-ubicacion" label="Ciudad y centro comercial" error={errors.location}>
              <select
                id="aj-ubicacion"
                value={draft.location}
                onChange={(event) => change({ location: event.target.value })}
                className={style(errors.location)}
                {...invalid('aj-ubicacion', errors.location)}
              >
                <option value="">Elige tu ubicación</option>
                {LOCATIONS.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.label}
                  </option>
                ))}
                <option value={OTHER_LOCATION}>{OTHER_LOCATION_LABEL}</option>
              </select>
            </Field>

            {draft.location === OTHER_LOCATION && (
              <div className="grid gap-space-md sm:grid-cols-2">
                <Field id="aj-ciudad" label="Ciudad" error={errors.otherCity}>
                  <input
                    id="aj-ciudad"
                    value={draft.otherCity}
                    onChange={(event) => change({ otherCity: event.target.value })}
                    className={style(errors.otherCity)}
                    {...invalid('aj-ciudad', errors.otherCity)}
                  />
                </Field>
                <Field id="aj-departamento" label="Departamento" error={errors.otherDepartment}>
                  <input
                    id="aj-departamento"
                    value={draft.otherDepartment}
                    onChange={(event) => change({ otherDepartment: event.target.value })}
                    className={style(errors.otherDepartment)}
                    {...invalid('aj-departamento', errors.otherDepartment)}
                  />
                </Field>
              </div>
            )}

            <Field
              id="aj-direccion"
              label="Dirección o local"
              error={errors.address}
              hint="Incluye el número de local o el piso si aplica."
            >
              <input
                id="aj-direccion"
                value={draft.address}
                autoComplete="street-address"
                onChange={(event) => change({ address: event.target.value })}
                className={style(errors.address)}
                {...invalid('aj-direccion', errors.address)}
              />
            </Field>

            {view && (
              <p className={`flex items-start gap-1 text-body-sm ${TONES[view.tone].text}`}>
                <Icon name={TONES[view.tone].icon} className="mt-0.5 text-[16px]" />
                {view.title}: {view.message}
              </p>
            )}
          </section>

          <section aria-labelledby="inventario" className={card}>
            <SectionTitle
              id="inventario"
              icon="tune"
              title="Preferencias de inventario"
              text="Automatizaciones y visibilidad de tu catálogo."
            />
            <SoonSwitch
              label="Alertas de bajo stock por WhatsApp"
              text="Te avisaremos cuando queden pocas unidades de un componente."
            />
            <SoonSwitch
              label="Pausar catálogo temporalmente"
              text="Oculta tus productos del catálogo sin borrar precios ni configuraciones."
            />
            <p className="text-body-sm text-outline">
              Mientras tanto, puedes pausar ofertas una por una desde{' '}
              <Link to="/vendedor/inventario" className="text-primary underline">
                tu inventario
              </Link>
              .
            </p>
          </section>

          <section
            aria-label="Ayuda"
            className={`${card} flex items-center justify-between gap-space-sm`}
          >
            <div className="flex items-center gap-space-sm">
              <Icon name="support_agent" className="text-[24px] text-primary" />
              <div className="space-y-0.5">
                <p className="flex flex-wrap items-center gap-2 text-label-md text-on-surface">
                  Mesa de ayuda para comerciantes
                  <SoonTag />
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Contacto directo con el equipo de {PLATFORM_NAME}.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled
              title="Próximamente"
              className="min-h-11 shrink-0 cursor-not-allowed rounded-xl border border-outline-variant px-4 text-label-md text-on-surface-variant opacity-70"
            >
              Contactar
            </button>
          </section>
        </div>
      </div>

      <footer className="space-y-space-sm border-t border-outline-variant/40 pt-space-md">
        {serverError && (
          <p
            role="alert"
            className="flex items-start gap-space-sm rounded-2xl bg-surface-container p-space-md text-body-sm text-on-surface"
          >
            <Icon name="error" className="mt-0.5 text-[20px] text-incompatible" />
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <p className="text-body-sm text-outline">
            {dirty ? 'Tienes cambios sin guardar.' : 'No hay cambios por guardar.'}
          </p>
          {actions}
        </div>
      </footer>
    </form>
  );
}

/** Ajustes de tienda (/vendedor/negocio): perfil, ubicación y WhatsApp del negocio. */
export default function SettingsPage() {
  const { user } = useSession();
  const store = useMyStore(user?.id);
  const verification = useVerificationStatus(user?.id);

  useEffect(() => {
    document.title = `Ajustes de tienda · ${PLATFORM_NAME}`;
  }, []);

  if (store.isError) {
    return (
      <div className="mx-auto w-full max-w-[85rem] p-space-md lg:p-space-lg">
        <ErrorNotice message={getErrorMessage(store.error)} onRetry={store.refetch} />
      </div>
    );
  }
  if (!store.data) {
    return (
      <div
        role="status"
        aria-label="Cargando los ajustes"
        className="mx-auto h-96 w-full max-w-[85rem] animate-pulse rounded-2xl bg-surface-container-low"
      />
    );
  }
  return <SettingsForm key={store.data.id} store={store.data} verification={verification.data} />;
}
