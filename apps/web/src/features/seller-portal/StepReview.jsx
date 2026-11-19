import { Link } from 'react-router';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { formatCOP, formatWarranty } from '../../shared/lib/format.js';
import { categoryLabels, specLine } from '../../shared/lib/specs.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import ConditionChip from '../../shared/ui/ConditionChip.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { StepActions } from './PublishFields.jsx';
import { parsePrice } from './PriceCell.jsx';
import { parseWarranty } from './publish.js';

const PHOTO_STATUS = {
  ready: 'Lista',
  uploading: 'Subiendo…',
  done: 'Subida',
  saved: 'Guardada',
  error: 'Falló',
};

/** Cómo se verá la oferta en el cotizador, armada con el componente y la tienda reales. */
function Preview({ component, draft, storeName }) {
  const line = specLine(component.category, component.specs);
  return (
    <aside
      aria-label="Vista previa para el usuario"
      className="space-y-space-sm rounded-2xl border border-outline-variant bg-surface-container-low p-space-md"
    >
      <h3 className="text-label-md text-on-surface">Vista previa para el usuario</h3>
      <div className="flex items-start gap-space-sm rounded-xl bg-surface p-space-sm">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">
          <CategoryIcon category={component.category} className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-label-md text-on-surface">{component.displayName}</p>
          {line && <p className="text-body-sm text-on-surface-variant">{line}</p>}
          <p className="flex items-center gap-1 text-body-sm text-outline">
            <Icon name="storefront" className="text-[16px]" />
            {storeName}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p className="tnum text-label-md text-on-surface">
            {formatCOP(parsePrice(draft.price) ?? 0)}
          </p>
          <ConditionChip condition={draft.condition} />
        </div>
      </div>
    </aside>
  );
}

/** Paso 4: revisión de los datos y publicación. */
export default function StepReview({
  component,
  draft,
  photos,
  storeName,
  publishing,
  error,
  onPublish,
  onBack,
  onEdit,
  editing = false,
}) {
  const duplicate = error instanceof ApiError && error.code === 'OFFER_DUPLICATE';
  const rows = [
    ['Componente canónico', `${component.displayName} · ${categoryLabels[component.category]}`],
    ['Precio asignado', formatCOP(parsePrice(draft.price) ?? 0)],
    ['Condición', draft.condition === 'new' ? 'Nuevo (sellado de fábrica)' : 'Usado (garantizado)'],
    ['Garantía', formatWarranty(parseWarranty(draft.warranty) ?? 0)],
    ['Fotos', photos.length === 0 ? 'Sin fotos' : `${photos.length} de 5`],
    ['Notas', draft.notes.trim() || 'Sin notas'],
  ];

  return (
    <section aria-labelledby="paso-resumen" className="space-y-space-lg">
      <header className="space-y-1">
        <p className="text-label-sm uppercase tracking-wider text-primary">Paso 04 de 04</p>
        <h2 id="paso-resumen" className="text-headline-md text-on-surface">
          Confirmación de publicación
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          {editing
            ? 'Revisa los cambios antes de guardarlos.'
            : 'Revisa los datos antes de publicar: la oferta quedará visible en el catálogo.'}
        </p>
      </header>

      <dl className="divide-y divide-outline-variant/40 rounded-2xl bg-surface-container-low px-space-md">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-space-sm sm:grid-cols-[12rem_1fr]">
            <dt className="text-label-sm uppercase tracking-wider text-outline">{label}</dt>
            <dd className="tnum text-body-md text-on-surface">{value}</dd>
          </div>
        ))}
      </dl>

      {photos.length > 0 &&
        (publishing || photos.some((photo) => !['ready', 'saved'].includes(photo.status))) && (
          <ul aria-label="Estado de las fotos" className="space-y-1">
            {photos.map((photo) => (
              <li
                key={photo.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-surface-container px-space-sm py-2 text-body-sm"
              >
                <span className="truncate text-on-surface">{photo.file.name}</span>
                <span
                  className={
                    photo.status === 'error' ? 'text-incompatible' : 'text-on-surface-variant'
                  }
                >
                  {PHOTO_STATUS[photo.status]}
                </span>
              </li>
            ))}
          </ul>
        )}

      <Preview component={component} draft={draft} storeName={storeName} />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-space-sm rounded-2xl bg-surface-container p-space-md text-body-sm text-on-surface"
        >
          <Icon name="error" className="mt-0.5 text-[20px] text-incompatible" />
          <span>
            {getErrorMessage(error)}{' '}
            {duplicate && (
              <Link to="/vendedor/inventario" className="text-primary underline">
                Ver mi inventario
              </Link>
            )}
          </span>
        </div>
      )}

      <StepActions onBack={onBack} backLabel="Volver a fotos">
        <div className="flex flex-col gap-space-sm sm:flex-row">
          {!editing && (
            <ComingSoonButton
              icon="save"
              label="Guardar borrador"
              className="h-12 border border-outline-variant px-5 text-on-surface"
            />
          )}
          <button
            type="button"
            onClick={onEdit}
            className="h-12 rounded-xl border border-outline-variant px-5 text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Modificar
          </button>
          <button
            type="button"
            disabled={publishing}
            onClick={onPublish}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name={editing ? 'save' : 'rocket_launch'} className="text-[18px]" />
            {editing
              ? publishing
                ? 'Guardando…'
                : 'Guardar cambios'
              : publishing
                ? 'Publicando…'
                : 'Publicar oferta ahora'}
          </button>
        </div>
      </StepActions>
    </section>
  );
}
