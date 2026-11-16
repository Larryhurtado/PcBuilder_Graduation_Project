import { constraintsFor } from '@hw/compat-engine';
import { useMemo, useState } from 'react';
import { getErrorMessage } from '../../shared/api/client.js';
import { formatCOP } from '../../shared/lib/format.js';
import { specLine } from '../../shared/lib/specs.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import Dialog from '../../shared/ui/Dialog.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import StatusPill from '../../shared/ui/StatusPill.jsx';
import { candidateStatus, toEngineBuild } from './analysis.js';
import { usePickerOffers } from './queries.js';
import { slotByCategory } from './slots.js';
import { useBuildStore } from './store.js';

const TITLE_ID = 'selector-titulo';

const list = (value) => (Array.isArray(value) ? value.join(', ') : value);

/** Cómo se muestra cada restricción derivada del armado (claves de `constraintsFor`). */
const constraintLabels = {
  socket: (v) => `Socket ${list(v)}`,
  ram_type: (v) => `RAM ${list(v)}`,
  form_factor: (v) => `Formato ${list(v)}`,
  cooler_socket: (v) => `Socket ${list(v)}`,
  max_height_mm: (v) => `Altura máx. ${v} mm`,
  max_length_mm: (v) => `Longitud máx. ${v} mm`,
  supports_form_factor: (v) => `Admite placa ${v}`,
  min_gpu_length_mm: (v) => `Cabe GPU de ${v} mm`,
  min_cooler_height_mm: (v) => `Cabe disipador de ${v} mm`,
  min_wattage_w: (v) => `Mínimo ${v} W`,
};

const sortOptions = [
  ['price_asc', 'Menor precio'],
  ['price_desc', 'Mayor precio'],
  ['newest', 'Más recientes'],
];

const conditionOptions = [
  ['', 'Todas'],
  ['new', 'Nuevo'],
  ['used', 'Usado'],
];

const selectClass =
  'h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25';

function PickerRow({ offer, status, selected, onSelect }) {
  const { component, store } = offer;
  const line = specLine(component.category, component.specs);
  return (
    <li className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-low p-space-md">
      <div className="flex gap-space-sm">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface text-outline">
          <CategoryIcon category={component.category} className="h-7 w-7" />
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="text-label-md font-semibold text-on-surface">{component.displayName}</h3>
          {line && <p className="tnum text-body-sm text-on-surface-variant">{line}</p>}
          <p className="flex items-center gap-1 text-body-sm text-outline">
            <Icon name="storefront" className="text-[16px] text-tertiary" />
            <span>
              {store.name} · {store.city}
              {offer.condition === 'used' && (
                <strong className="ml-1 font-semibold text-tertiary">· Usado</strong>
              )}
            </span>
          </p>
          {status === 'ok' && <StatusPill status="ok">Compatible</StatusPill>}
          {status === 'unknown' && (
            <StatusPill status="unknown">No verificable: confírmalo con la tienda</StatusPill>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-space-sm">
        <span className="tnum text-price-display text-on-surface">{formatCOP(offer.priceCop)}</span>
        {selected ? (
          <span className="flex min-h-11 items-center gap-1 px-3 text-label-sm text-compatible">
            <Icon name="check" className="text-[16px]" />
            En tu armado
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(offer)}
            aria-label={`Agregar ${component.displayName}`}
            className="min-h-11 rounded-xl bg-primary-container px-5 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
          >
            Agregar
          </button>
        )}
      </div>
    </li>
  );
}

function PickerContent({ category, onClose, onSelect }) {
  const slot = slotByCategory[category];
  const parts = useBuildStore((state) => state.parts);
  const [sort, setSort] = useState('price_asc');
  const [condition, setCondition] = useState('');

  const constraints = useMemo(
    () => constraintsFor(category, toEngineBuild(parts)),
    [category, parts],
  );
  const query = usePickerOffers({ category, constraints, sort, condition });

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const evaluated = useMemo(
    () =>
      items.map((offer) => ({
        offer,
        status: candidateStatus(category, offer.component.specs ?? {}, parts).status,
      })),
    [items, category, parts],
  );
  const visible = evaluated.filter((item) => item.status !== 'fail');
  const hidden = evaluated.length - visible.length;
  const chips = Object.entries(constraints)
    .filter(([key]) => constraintLabels[key])
    .map(([key, value]) => constraintLabels[key](value));

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 space-y-space-md border-b border-outline-variant bg-surface-container p-space-md">
        <div className="flex items-start justify-between gap-space-sm">
          <div>
            <h2 id={TITLE_ID} className="text-headline-sm text-on-surface">
              Elegir {slot.pick}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              {chips.length > 0
                ? 'Solo se muestran piezas compatibles con tu armado.'
                : 'Aún no hay piezas elegidas que limiten esta categoría.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar selector"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-outline transition-colors hover:bg-surface hover:text-on-surface"
          >
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>

        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-space-xs" aria-label="Filtros aplicados">
            {chips.map((chip) => (
              <li
                key={chip}
                className="tnum rounded bg-surface px-2 py-0.5 text-code-metric text-on-surface-variant"
              >
                {chip}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-space-sm">
          <label className="space-y-1 text-label-sm text-outline">
            <span>Ordenar por</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className={selectClass}
            >
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-label-sm text-outline">
            <span>Estado</span>
            <select
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              className={selectClass}
            >
              {conditionOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex-1 space-y-space-md p-space-md">
        {query.isPending && (
          <ul role="status" aria-label="Cargando piezas" className="space-y-space-sm">
            {Array.from({ length: 4 }, (_, index) => (
              <li
                key={index}
                className="h-36 animate-pulse rounded-2xl bg-surface-container-low motion-reduce:animate-none"
              />
            ))}
          </ul>
        )}

        {query.isError && (
          <ErrorNotice message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
        )}

        {query.isSuccess && visible.length === 0 && (
          <div className="rounded-2xl bg-surface-container-low p-6 text-body-md text-on-surface-variant">
            <p className="font-semibold text-on-surface">No hay alternativas compatibles.</p>
            <p className="mt-1">
              {condition
                ? 'Prueba con otro estado, o cambia una de las piezas que limitan esta categoría.'
                : 'Cambia una de las piezas que limitan esta categoría para ver más opciones.'}
            </p>
          </div>
        )}

        {visible.length > 0 && (
          <ul className="space-y-space-sm">
            {visible.map(({ offer, status }) => (
              <PickerRow
                key={offer.offerId}
                offer={offer}
                status={status}
                selected={parts[category]?.offerId === offer.offerId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}

        {hidden > 0 && (
          <p className="text-body-sm text-outline">
            {hidden === 1
              ? 'Se ocultó 1 pieza incompatible con tu armado.'
              : `Se ocultaron ${hidden} piezas incompatibles con tu armado.`}
          </p>
        )}

        {query.hasNextPage && (
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="h-11 w-full rounded-xl border border-outline-variant text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-60"
          >
            {query.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Selector de piezas (HU-06): panel lateral en escritorio y pantalla completa en móvil, con solo
 * las piezas compatibles con lo ya elegido. Las de datos incompletos salen como "No verificable".
 * @param {{ category: string | null, onClose: () => void, onSelect: (offer: any) => void }} props
 */
export default function PartPicker({ category, onClose, onSelect }) {
  return (
    <Dialog open={Boolean(category)} onClose={onClose} variant="drawer" labelledBy={TITLE_ID}>
      {category && <PickerContent category={category} onClose={onClose} onSelect={onSelect} />}
    </Dialog>
  );
}
