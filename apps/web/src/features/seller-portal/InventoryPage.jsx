import { componentCategories } from '@hw/contracts';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { formatCOP } from '../../shared/lib/format.js';
import { categoryLabels } from '../../shared/lib/specs.js';
import { notify } from '../../shared/notices.js';
import { useSession } from '../../shared/session/useSession.js';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import ConfirmDialog from '../../shared/ui/ConfirmDialog.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import SearchField from '../../shared/ui/SearchField.jsx';
import { filterOffers, PAGE_SIZE, pageWindow, summarize } from './inventory.js';
import { Delta, Kpi } from './kpi.jsx';
import OfferRow, { COLUMNS } from './OfferRow.jsx';
import {
  useAnalytics,
  useOfferActions,
  useSellerOffers,
  useVerificationStatus,
} from './queries.js';
import { previousRange, rangeFor, todayInColombia } from './ranges.js';
import { PUBLISH_BLOCKED_MESSAGE } from './verification.js';

const number = new Intl.NumberFormat('es-CO');

const STATUS_FILTERS = [
  ['', 'Todas'],
  ['active', 'Activas'],
  ['paused', 'Pausadas'],
];

function EmptyState({ onClear, hasOffers }) {
  return (
    <div className="flex flex-col items-center gap-space-sm rounded-2xl bg-surface-container px-space-md py-space-2xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-secondary">
        <Icon name={hasOffers ? 'search_off' : 'inventory_2'} className="text-[28px]" />
      </span>
      <h2 className="text-headline-sm text-on-surface">
        {hasOffers ? 'Ninguna oferta coincide' : 'Aún no has publicado ofertas'}
      </h2>
      <p className="max-w-md text-body-sm text-on-surface-variant">
        {hasOffers
          ? 'Prueba con otra búsqueda, otro estado u otra categoría.'
          : 'Publica tu primer producto para que aparezca en el catálogo y en las cotizaciones.'}
      </p>
      {hasOffers ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-space-xs h-11 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
        >
          Quitar los filtros
        </button>
      ) : (
        <Link
          to="/vendedor/publicar"
          className="mt-space-xs inline-flex h-11 items-center rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
        >
          Publicar producto
        </Link>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, total, shown, from, onPage }) {
  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col items-center justify-between gap-space-sm border-t border-outline-variant/40 p-space-md sm:flex-row"
    >
      <p className="tnum text-body-sm text-on-surface-variant">
        Mostrando{' '}
        <strong className="font-semibold text-on-surface">
          {from}–{from + shown - 1}
        </strong>{' '}
        de <strong className="font-semibold text-on-surface">{total}</strong>{' '}
        {total === 1 ? 'oferta' : 'ofertas'}
      </p>
      {totalPages > 1 && (
        <ul className="flex items-center gap-1">
          <li className="list-none">
            <button
              type="button"
              onClick={() => onPage(page - 1)}
              disabled={page === 1}
              className="flex h-11 items-center gap-1 rounded-lg px-3 text-label-md text-on-surface-variant hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="chevron_left" className="text-[18px]" />
              Anterior
            </button>
          </li>
          {pageWindow(page, totalPages).map((item, index) => (
            <li key={`${item}-${index}`} className="list-none">
              {item === '…' ? (
                <span aria-hidden="true" className="px-1 text-outline">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onPage(item)}
                  aria-label={`Página ${item}`}
                  aria-current={item === page ? 'page' : undefined}
                  className="tnum h-11 min-w-11 rounded-lg px-2 text-label-md text-on-surface-variant hover:bg-surface aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container"
                >
                  {item}
                </button>
              )}
            </li>
          ))}
          <li className="list-none">
            <button
              type="button"
              onClick={() => onPage(page + 1)}
              disabled={page === totalPages}
              className="flex h-11 items-center gap-1 rounded-lg px-3 text-label-md text-on-surface-variant hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}

/** Inventario y ofertas (/vendedor/inventario): precios, visibilidad y baja de las ofertas del vendedor. */
export default function InventoryPage() {
  const { user } = useSession();
  const offersQuery = useSellerOffers(user?.id);
  const verification = useVerificationStatus(user?.id);
  const actions = useOfferActions(user?.id);

  const today = todayInColombia();
  const week = useMemo(() => rangeFor('7d', today), [today]);
  const previous = useMemo(() => previousRange(week), [week]);
  const clicks = useAnalytics(user?.id, week);
  const clicksBefore = useAnalytics(user?.id, previous);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    document.title = `Inventario · ${PLATFORM_NAME}`;
  }, []);

  const offers = useMemo(() => offersQuery.data ?? [], [offersQuery.data]);
  const approved = verification.data?.status === 'approved';
  const canEdit = approved;
  const stats = useMemo(() => summarize(offers), [offers]);
  const filtered = useMemo(
    () => filterOffers(offers, { q, status, category }),
    [offers, q, status, category],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const from = (current - 1) * PAGE_SIZE + 1;
  const visible = filtered.slice(from - 1, from - 1 + PAGE_SIZE);

  const filterBy = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const clearFilters = () => {
    setQ('');
    setStatus('');
    setCategory('');
    setPage(1);
  };

  const handleDelete = () => {
    setDeleteError(null);
    actions.remove.mutate(deleting.offerId, {
      onSuccess: () => {
        notify({ message: `${deleting.component.displayName} se eliminó de tu inventario.` });
        setDeleting(null);
      },
      onError: (error) =>
        setDeleteError(error instanceof ApiError ? error.userMessage : getErrorMessage(error)),
    });
  };

  const counts = { '': offers.length, active: stats.active, paused: stats.paused };

  return (
    <div className="mx-auto w-full max-w-[85rem] space-y-space-lg p-space-md lg:p-space-lg">
      <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
        <div className="space-y-space-xs">
          <p className="text-label-sm uppercase tracking-wider text-primary">Módulo comercial</p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Gestión de inventario y ofertas
          </h1>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            Administra los precios y la visibilidad de tus ofertas publicadas en el catálogo.
          </p>
        </div>
        <div className="flex flex-col gap-space-xs lg:items-end">
          <div className="flex flex-wrap gap-space-xs">
            <ComingSoonButton
              icon="upload_file"
              label="Carga masiva (CSV)"
              className="h-14 border border-outline-variant px-4 text-on-surface"
            />
            {approved ? (
              <Link
                to="/vendedor/publicar"
                className="flex h-14 items-center gap-2 rounded-xl bg-primary-container px-4 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
              >
                <Icon name="add_circle" className="text-[18px]" />
                Publicar producto
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-describedby="publicar-bloqueado"
                className="flex h-14 cursor-not-allowed items-center gap-2 rounded-xl bg-primary-container px-4 text-label-md text-on-primary-container opacity-50"
              >
                <Icon name="add_circle" className="text-[18px]" />
                Publicar producto
              </button>
            )}
          </div>
          {verification.data && !approved && (
            <p
              id="publicar-bloqueado"
              className="max-w-sm text-body-sm text-on-surface-variant lg:text-right"
            >
              {PUBLISH_BLOCKED_MESSAGE}.
            </p>
          )}
        </div>
      </div>

      {verification.data && !approved && (
        <p
          role="note"
          className="flex items-start gap-space-sm rounded-2xl bg-[color-mix(in_srgb,var(--color-unverifiable)_10%,var(--color-surface-container))] p-space-md text-body-sm text-on-surface"
        >
          <Icon name="info" className="mt-0.5 text-[20px] text-unverifiable" />
          <span>
            Tu negocio aún no está verificado: puedes ver y eliminar tus ofertas, pero no editarlas
            ni pausarlas.{' '}
            <Link to="/vendedor/verificacion" className="text-primary underline">
              Ver estado de verificación
            </Link>
          </span>
        </p>
      )}

      <section
        aria-label="Resumen del inventario"
        className="grid gap-space-md sm:grid-cols-2 xl:grid-cols-4"
      >
        <Kpi
          label="Ofertas activas"
          icon="check_circle"
          value={number.format(stats.active)}
          loading={offersQuery.isPending}
        >
          <p className="flex items-center gap-1 text-body-sm text-compatible">
            <Icon name="public" className="text-[16px]" />
            Visibles en el catálogo
          </p>
        </Kpi>
        <Kpi
          label="En pausa"
          icon="pause_circle"
          value={number.format(stats.paused)}
          loading={offersQuery.isPending}
        >
          <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
            <Icon name="visibility_off" className="text-[16px]" />
            Ocultas del catálogo
          </p>
        </Kpi>
        <Kpi
          label="Precio promedio"
          icon="payments"
          value={stats.averagePrice === null ? '—' : formatCOP(stats.averagePrice)}
          loading={offersQuery.isPending}
        >
          <p className="tnum text-body-sm text-on-surface-variant">
            {stats.minPrice === null
              ? 'Sin ofertas activas'
              : `Rango: ${formatCOP(stats.minPrice)} a ${formatCOP(stats.maxPrice)}`}
          </p>
        </Kpi>
        <Kpi
          label="Clics a WhatsApp (7 días)"
          icon="chat"
          value={clicks.data && number.format(clicks.data.totals.whatsappClicks)}
          loading={!clicks.data && clicks.isPending}
        >
          {clicks.data && clicksBefore.data && (
            <Delta
              current={clicks.data.totals.whatsappClicks}
              previous={clicksBefore.data.totals.whatsappClicks}
            />
          )}
        </Kpi>
      </section>

      <section
        aria-label="Filtros del inventario"
        className="space-y-space-sm rounded-2xl bg-surface-container p-space-md"
      >
        <div className="flex flex-col gap-space-sm lg:flex-row lg:items-center">
          <SearchField
            initial={q}
            label="Buscar en tu inventario"
            placeholder="Buscar por componente, marca o modelo"
            onSearch={filterBy(setQ)}
          />
          <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <span className="sr-only">Categoría</span>
            <select
              value={category}
              onChange={(event) => filterBy(setCategory)(event.target.value)}
              aria-label="Filtrar por categoría"
              className="h-12 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25 lg:w-64"
            >
              <option value="">Todas las categorías</option>
              {componentCategories.map((key) => (
                <option key={key} value={key}>
                  {categoryLabels[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-space-xs">
          {STATUS_FILTERS.map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              aria-pressed={status === value}
              onClick={() => filterBy(setStatus)(value)}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
            >
              {label}
              <span className="tnum text-label-sm opacity-80">{counts[value]}</span>
            </button>
          ))}
          <button
            type="button"
            disabled
            title="Próximamente"
            className="flex min-h-11 cursor-not-allowed items-center gap-1.5 rounded-full bg-surface px-4 text-label-md text-on-surface-variant opacity-60"
          >
            Sin stock
            <span className="text-[10px] font-medium uppercase tracking-wider">Próximamente</span>
          </button>
        </div>
      </section>

      {offersQuery.isPending && (
        <div
          role="status"
          aria-label="Cargando inventario"
          className="h-64 rounded-2xl bg-surface-container motion-safe:animate-pulse"
        />
      )}

      {offersQuery.isError && (
        <ErrorNotice
          message={getErrorMessage(offersQuery.error)}
          onRetry={() => offersQuery.refetch()}
        />
      )}

      {offersQuery.isSuccess && filtered.length === 0 && (
        <EmptyState hasOffers={offers.length > 0} onClear={clearFilters} />
      )}

      {filtered.length > 0 && (
        <section
          aria-label="Ofertas"
          className="overflow-hidden rounded-2xl lg:bg-surface-container"
        >
          <div
            aria-hidden="true"
            className={`hidden gap-space-md bg-surface-container-high px-space-lg py-space-sm text-[11px] font-semibold uppercase tracking-wider text-outline lg:grid ${COLUMNS}`}
          >
            <span>Componente / modelo</span>
            <span>Condición</span>
            <span>Precio COP (edición rápida)</span>
            <span>Garantía</span>
            <span>Estado y visibilidad</span>
            <span className="text-right">Acciones</span>
          </div>
          <ul className="space-y-space-sm lg:space-y-0 lg:divide-y lg:divide-outline-variant/40">
            {visible.map((offer) => (
              <OfferRow
                key={offer.offerId}
                offer={offer}
                canEdit={canEdit}
                togglePending={
                  actions.status.isPending && actions.status.variables?.id === offer.offerId
                }
                onToggle={() =>
                  actions.status.mutate({
                    id: offer.offerId,
                    status: offer.status === 'active' ? 'paused' : 'active',
                  })
                }
                onSavePrice={(priceCop) =>
                  actions.update.mutateAsync({ id: offer.offerId, body: { priceCop } })
                }
                onDelete={() => {
                  setDeleteError(null);
                  setDeleting(offer);
                }}
              />
            ))}
          </ul>
          <div className="mt-space-sm rounded-2xl bg-surface-container lg:mt-0 lg:rounded-none">
            <Pagination
              page={current}
              totalPages={totalPages}
              total={filtered.length}
              shown={visible.length}
              from={from}
              onPage={setPage}
            />
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="¿Eliminar esta oferta?"
        message={
          <>
            «{deleting?.component.displayName}» dejará de aparecer en el catálogo y en las
            cotizaciones. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar oferta"
        busyLabel="Eliminando…"
        busy={actions.remove.isPending}
        danger
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
