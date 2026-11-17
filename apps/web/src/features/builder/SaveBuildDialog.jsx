import { useState } from 'react';
import { Link } from 'react-router';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { copyText } from '../../shared/lib/clipboard.js';
import { useSession } from '../../shared/session/useSession.js';
import Dialog from '../../shared/ui/Dialog.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { buildShareUrl } from '../builds/share.js';
import { useSaveBuild } from '../builds/queries.js';

const TITLE_ID = 'guardar-armado-titulo';
const DEFAULT_NAME = 'Mi configuración';

/** Las piezas del armado como las espera POST /builds (el precio sale de la oferta elegida). */
const toItems = (parts) =>
  Object.values(parts).map((offer) => ({
    category: offer.component.category,
    componentId: offer.component.id,
    offerId: offer.offerId,
  }));

function SavedView({ build, user, onClose }) {
  const [copied, setCopied] = useState(null);
  const url = buildShareUrl(build.shareCode);

  const copy = async () => setCopied(await copyText(url));

  return (
    <div className="space-y-space-md p-space-lg">
      <div className="flex items-start gap-space-sm">
        <Icon name="check_circle" className="mt-0.5 text-[28px] text-compatible" />
        <div>
          <h2 id={TITLE_ID} className="text-headline-sm text-on-surface">
            Armado guardado
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            «{build.name}» quedó guardado
            {user ? ' en tu cuenta' : ' sin cuenta'}.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="enlace-armado" className="text-label-md text-on-surface">
          Enlace para compartir
        </label>
        <div className="flex gap-space-xs">
          <input
            id="enlace-armado"
            readOnly
            value={url}
            onFocus={(event) => event.target.select()}
            className="h-12 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface"
          />
          <button
            type="button"
            onClick={copy}
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-surface px-4 text-label-md text-on-surface transition-colors hover:bg-surface-variant"
          >
            <Icon name="content_copy" className="text-[18px]" />
            Copiar
          </button>
        </div>
        <p role="status" className="min-h-5 text-body-sm text-on-surface-variant">
          {copied === true && 'Enlace copiado.'}
          {copied === false && 'No se pudo copiar: selecciona el enlace y cópialo a mano.'}
        </p>
      </div>

      {!user && (
        <p className="rounded-xl bg-surface p-space-sm text-body-sm text-on-surface-variant">
          Como no ingresaste, este enlace es la única forma de abrir el armado: guárdalo.{' '}
          <Link to="/ingresar?next=%2Farmador" className="text-primary underline">
            Ingresa
          </Link>{' '}
          para guardar los próximos en tu cuenta.
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-space-xs">
        {user && (
          <Link
            to="/cuenta/armados"
            className="flex h-12 items-center rounded-xl bg-primary-container px-5 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
          >
            Ver mis armados
          </Link>
        )}
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-xl bg-surface px-5 text-label-md text-on-surface transition-colors hover:bg-surface-variant"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function SaveForm({ parts, conflicts, onClose }) {
  const { user } = useSession();
  const mutation = useSaveBuild(user?.id);
  const [name, setName] = useState(DEFAULT_NAME);
  const [nameError, setNameError] = useState(null);
  const [serverError, setServerError] = useState(null);

  if (mutation.isSuccess) {
    return <SavedView build={mutation.data.build} user={user} onClose={onClose} />;
  }

  const submit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNameError('Escribe un nombre para tu armado');
    if (trimmed.length > 100) return setNameError('Máximo 100 caracteres');
    setNameError(null);
    setServerError(null);
    mutation.mutate(
      { name: trimmed, items: toItems(parts), draft: conflicts > 0 },
      {
        onError: (error) =>
          setServerError(error instanceof ApiError ? error.userMessage : getErrorMessage(error)),
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-space-md p-space-lg">
      <div className="space-y-1">
        <h2 id={TITLE_ID} className="text-headline-sm text-on-surface">
          Guardar armado
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          Se guardan las piezas y las ofertas elegidas, con su precio de hoy.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="nombre-armado" className="text-label-md text-on-surface">
          Nombre del armado
        </label>
        <input
          id="nombre-armado"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? 'nombre-armado-error' : undefined}
          className="h-12 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-md text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25"
        />
        {nameError && (
          <p
            id="nombre-armado-error"
            className="flex items-center gap-1 text-body-sm text-incompatible"
          >
            <Icon name="error" className="text-[16px]" />
            {nameError}
          </p>
        )}
      </div>

      {conflicts > 0 && (
        <p className="flex items-start gap-space-xs rounded-xl bg-[color-mix(in_srgb,var(--color-unverifiable)_10%,var(--color-surface-container))] p-space-sm text-body-sm text-on-surface">
          <Icon name="warning" className="mt-0.5 text-[18px] text-unverifiable" />
          <span>
            Tu armado tiene {conflicts} {conflicts === 1 ? 'conflicto' : 'conflictos'} de
            compatibilidad: se guardará como borrador, con el aviso.
          </span>
        </p>
      )}

      {!user && (
        <p className="flex items-start gap-space-xs rounded-xl bg-surface p-space-sm text-body-sm text-on-surface-variant">
          <Icon name="info" className="mt-0.5 text-[18px] text-outline" />
          <span>
            No has ingresado: el armado se guardará sin cuenta y solo se abrirá con su enlace.{' '}
            <Link to="/ingresar?next=%2Farmador" className="text-primary underline">
              Ingresa
            </Link>{' '}
            para guardarlo en tu cuenta.
          </span>
        </p>
      )}

      {serverError && (
        <p
          role="alert"
          className="flex items-start gap-space-xs rounded-xl bg-[color-mix(in_srgb,var(--color-incompatible)_10%,var(--color-surface-container))] p-space-sm text-body-sm text-on-surface"
        >
          <Icon name="error" className="mt-0.5 text-[18px] text-incompatible" />
          <span>{serverError}</span>
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-space-xs">
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-xl bg-surface px-5 text-label-md text-on-surface transition-colors hover:bg-surface-variant"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex h-12 items-center gap-2 rounded-xl bg-primary-container px-5 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Icon name="bookmark" className="text-[18px]" />
          {mutation.isPending ? 'Guardando…' : 'Guardar armado'}
        </button>
      </div>
    </form>
  );
}

/**
 * Guardar el armado en curso (POST /builds). Con conflictos de compatibilidad se guarda como
 * borrador, como exige la API. Sin sesión queda anónimo y se abre con su enlace.
 * @param {{ open: boolean, onClose: () => void, parts: Record<string, any>, conflicts: number }} props
 */
export default function SaveBuildDialog({ open, onClose, parts, conflicts }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy={TITLE_ID} variant="narrow">
      <SaveForm parts={parts} conflicts={conflicts} onClose={onClose} />
    </Dialog>
  );
}
