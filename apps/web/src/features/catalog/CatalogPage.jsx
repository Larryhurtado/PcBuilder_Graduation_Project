import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import Container from '../../shared/ui/Container.jsx';
import Dialog from '../../shared/ui/Dialog.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import Toast from '../../shared/ui/Toast.jsx';
import { useBuildStore } from '../builder/store.js';
import ActiveFilters from './ActiveFilters.jsx';
import CatalogCard, { CatalogCardSkeleton } from './CatalogCard.jsx';
import CatalogRow from './CatalogRow.jsx';
import FilterPanel from './FilterPanel.jsx';
import { countFilters } from './filters.js';
import { useCatalogOffers } from './queries.js';
import SearchBar from './SearchBar.jsx';
import { useCatalogFilters } from './useCatalogFilters.js';

const FILTERS_TITLE_ID = 'filtros-titulo';

const gridClass = 'grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-3';

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center gap-space-sm rounded-2xl bg-surface-container px-space-md py-space-2xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-secondary">
        <Icon name="search_off" className="text-[28px]" />
      </span>
      <h2 className="text-headline-sm text-on-surface">
        {hasFilters
          ? 'No encontramos ofertas con estos filtros'
          : 'Todavía no hay ofertas publicadas'}
      </h2>
      <p className="max-w-md text-body-sm text-on-surface-variant">
        {hasFilters
          ? 'Prueba con otra categoría, un rango de precio más amplio o quita algún atributo técnico.'
          : 'Vuelve pronto: las tiendas verificadas están publicando sus ofertas.'}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-space-xs h-11 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
        >
          Quitar todos los filtros
        </button>
      )}
    </div>
  );
}

/** Catálogo (/catalogo): ofertas de tiendas verificadas con filtros, orden y búsqueda (HU-09, HU-10, HU-11). */
export default function CatalogPage() {
  const { filters, update, clear } = useCatalogFilters();
  const query = useCatalogOffers(filters);
  const parts = useBuildStore((state) => state.parts);
  const setPart = useBuildStore((state) => state.setPart);

  const [view, setView] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  useEffect(() => {
    document.title = `Catálogo · ${PLATFORM_NAME}`;
  }, []);

  const offers = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const filterCount = countFilters(filters);

  const handleSearch = useCallback((q) => update({ q }, { replace: true }), [update]);
  const handleSort = useCallback((sort) => update({ sort }), [update]);

  const handleAdd = useCallback(
    (offer) => {
      const previous = parts[offer.component.category];
      setPart(offer);
      setToast({
        message: previous
          ? `${offer.component.displayName} reemplazó a ${previous.component.displayName} en tu armado.`
          : `${offer.component.displayName} se agregó a tu armado.`,
      });
    },
    [parts, setPart],
  );

  const Item = view === 'list' ? CatalogRow : CatalogCard;
  const refreshing = query.isPlaceholderData;

  return (
    <Container size="wide" className="space-y-space-lg py-space-lg">
      <nav aria-label="Ruta de navegación" className="text-body-sm text-on-surface-variant">
        <ol className="flex items-center gap-2">
          <li>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center hover:text-on-surface hover:underline md:min-h-0"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden="true" className="text-outline-variant">
            /
          </li>
          <li aria-current="page" className="text-on-surface">
            Catálogo de componentes
          </li>
        </ol>
      </nav>

      <div className="space-y-space-xs">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1 text-label-sm text-primary">
          <Icon name="verified" className="text-[14px]" />
          Inventario colombiano agregado
        </p>
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
          Catálogo de componentes y ofertas
        </h1>
        <p className="max-w-2xl text-body-md text-on-surface-variant">
          Explora hardware de tiendas verificadas de Cali y Bogotá. Compara precios y
          especificaciones, y cotiza por WhatsApp con la tienda.
        </p>
      </div>

      <SearchBar
        q={filters.q}
        sort={filters.sort}
        view={view}
        filterCount={filterCount}
        onSearch={handleSearch}
        onSort={handleSort}
        onView={setView}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <ActiveFilters filters={filters} update={update} clear={clear} />

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          aria-label="Filtros"
          className="hidden rounded-2xl bg-surface-container p-space-md lg:sticky lg:top-20 lg:block lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
        >
          <FilterPanel filters={filters} update={update} clear={clear} />
        </aside>

        <section
          aria-label="Resultados"
          aria-busy={refreshing}
          className="min-w-0 space-y-space-md"
        >
          {query.isPending && (
            <div className={gridClass} role="status" aria-label="Cargando ofertas">
              {Array.from({ length: 6 }, (_, index) => (
                <CatalogCardSkeleton key={index} />
              ))}
            </div>
          )}

          {query.isError && (
            <ErrorNotice message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
          )}

          {query.isSuccess && offers.length === 0 && (
            <EmptyState
              hasFilters={filterCount > 0 || Boolean(filters.q)}
              onClear={() => clear({ includeSearch: true })}
            />
          )}

          {offers.length > 0 && (
            <>
              <p className="tnum text-body-sm text-on-surface-variant" role="status">
                Mostrando {offers.length} {offers.length === 1 ? 'oferta' : 'ofertas'}
                {query.hasNextPage ? ' (hay más)' : ''}
              </p>
              <ul
                className={`${view === 'list' ? 'space-y-space-sm' : gridClass} transition-opacity motion-reduce:transition-none ${
                  refreshing ? 'opacity-60' : ''
                }`}
              >
                {offers.map((offer) => {
                  const inBuild = parts[offer.component.category]?.offerId === offer.offerId;
                  return (
                    <li key={offer.offerId} className="list-none">
                      <Item
                        offer={offer}
                        inBuild={inBuild}
                        replaces={Boolean(parts[offer.component.category]) && !inBuild}
                        onAdd={handleAdd}
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {query.hasNextPage && (
            <button
              type="button"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
              className="h-12 w-full rounded-xl border border-outline-variant text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-60"
            >
              {query.isFetchingNextPage ? 'Cargando…' : 'Cargar más ofertas'}
            </button>
          )}
        </section>
      </div>

      <Dialog
        open={filtersOpen}
        onClose={closeFilters}
        variant="drawer"
        labelledBy={FILTERS_TITLE_ID}
      >
        <div className="flex min-h-full flex-col">
          <div className="flex-1 p-space-md">
            <div className="mb-space-md flex justify-end">
              <button
                type="button"
                onClick={closeFilters}
                aria-label="Cerrar filtros"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-outline transition-colors hover:bg-surface hover:text-on-surface"
              >
                <Icon name="close" className="text-[22px]" />
              </button>
            </div>
            <FilterPanel
              filters={filters}
              update={update}
              clear={clear}
              titleId={FILTERS_TITLE_ID}
            />
          </div>
          <div className="sticky bottom-0 border-t border-outline-variant bg-surface-container p-space-md">
            <button
              type="button"
              onClick={closeFilters}
              className="h-12 w-full rounded-xl bg-primary-container text-label-md text-on-primary-container"
            >
              Ver resultados
            </button>
          </div>
        </div>
      </Dialog>

      {toast && (
        <Toast message={toast.message} onClose={closeToast}>
          <Link
            to="/armador"
            className="flex min-h-11 shrink-0 items-center rounded-lg px-3 text-label-sm text-primary transition-colors hover:bg-surface"
          >
            Ver armador
          </Link>
        </Toast>
      )}
    </Container>
  );
}
