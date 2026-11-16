import { useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import Container from '../../shared/ui/Container.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import SearchField from '../../shared/ui/SearchField.jsx';
import StoreCard, { StoreCardSkeleton } from '../../shared/ui/StoreCard.jsx';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import { useStores } from './queries.js';
import { MIN_SEARCH_LENGTH, STORE_SORTS, useStoreFilters } from './useStoreFilters.js';

/** La API devuelve como máximo 50 tiendas por consulta. */
const LIMIT = 50;

const gridClass = 'grid grid-cols-1 gap-space-md md:grid-cols-2 xl:grid-cols-3';

const sorters = {
  offers: (a, b) => b.offersCount - a.offersCount || a.name.localeCompare(b.name, 'es'),
  name: (a, b) => a.name.localeCompare(b.name, 'es'),
};

function Stat({ label, value, hint, icon }) {
  return (
    <div className="rounded-2xl bg-surface-container p-space-md">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
          {label}
        </span>
        <Icon name={icon} className="text-[18px] text-outline" />
      </div>
      <p className="tnum mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-headline-lg-mobile text-on-surface md:text-headline-lg">{value}</span>
        <span className="text-label-sm text-secondary">{hint}</span>
      </p>
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="flex flex-col items-center gap-space-sm rounded-2xl bg-surface-container px-space-md py-space-2xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-secondary">
        <Icon name="storefront" className="text-[28px]" />
      </span>
      <h2 className="text-headline-sm text-on-surface">No encontramos tiendas con esos filtros</h2>
      <p className="max-w-md text-body-sm text-on-surface-variant">
        Prueba con otro nombre o con todas las ciudades.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-space-xs h-11 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
      >
        Quitar los filtros
      </button>
    </div>
  );
}

/** Directorio de tiendas (/tiendas): comercios verificados con búsqueda, ciudad y orden. */
export default function StoresPage() {
  const { filters, update, clear } = useStoreFilters();
  const searchable = filters.q && filters.q.length >= MIN_SEARCH_LENGTH ? filters.q : undefined;

  // Sin filtros ambas consultas son la misma (misma clave), así que se piden una sola vez
  const all = useStores({ limit: LIMIT });
  const list = useStores({ limit: LIMIT, q: searchable, city: filters.city });

  useEffect(() => {
    document.title = `Tiendas verificadas · ${PLATFORM_NAME}`;
  }, []);

  const handleSearch = useCallback((q) => update({ q }, { replace: true }), [update]);

  const cities = useMemo(() => {
    const counts = new Map();
    for (const store of all.data?.items ?? []) {
      if (store.city) counts.set(store.city, (counts.get(store.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [all.data]);

  const stores = useMemo(
    () => [...(list.data?.items ?? [])].sort(sorters[filters.sort]),
    [list.data, filters.sort],
  );

  const total = all.data?.items.length;
  const offersTotal = all.data?.items.reduce((sum, store) => sum + store.offersCount, 0);
  const capped = total === LIMIT;
  const hasFilters = Boolean(filters.q || filters.city);
  const refreshing = list.isPlaceholderData;

  const cityChip = (value, label, count) => (
    <button
      key={value || 'all'}
      type="button"
      aria-pressed={(filters.city ?? '') === value}
      onClick={() => update({ city: value })}
      className="flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
    >
      {label}
      {count !== undefined && <span className="tnum text-label-sm opacity-80">{count}</span>}
    </button>
  );

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
            Tiendas verificadas
          </li>
        </ol>
      </nav>

      <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
        <div className="space-y-space-xs">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1 text-label-sm text-primary">
            <Icon name="verified" className="text-[14px]" />
            Comercios verificados
          </p>
          <h1 className="max-w-2xl text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Directorio de tiendas de hardware en Colombia
          </h1>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            Tiendas y distribuidores de tecnología cuya existencia como negocio fue verificada.
            Compara sus inventarios y escríbeles directo por WhatsApp.
          </p>
        </div>
        <aside className="flex max-w-sm items-start gap-space-sm rounded-2xl bg-surface-container p-space-md">
          <Icon name="shield" className="mt-0.5 text-[22px] text-secondary" />
          <div>
            <p className="text-label-sm uppercase tracking-wider text-on-surface">
              Qué significa verificado
            </p>
            <p className="text-body-sm text-on-surface-variant">
              Confirmamos que el comercio existe. No garantizamos el cumplimiento de sus ofertas.
            </p>
          </div>
        </aside>
      </div>

      {all.data && (
        <div className="grid grid-cols-2 gap-space-sm">
          <Stat
            label="Tiendas verificadas"
            value={capped ? `${total}+` : total}
            hint={
              cities.length > 0
                ? `en ${cities.length} ${cities.length === 1 ? 'ciudad' : 'ciudades'}`
                : ''
            }
            icon="storefront"
          />
          <Stat label="Inventario" value={offersTotal} hint="ofertas activas" icon="inventory_2" />
        </div>
      )}

      <div className="space-y-space-sm rounded-2xl bg-surface-container p-space-sm">
        <div className="flex flex-col gap-space-sm lg:flex-row lg:items-center">
          <SearchField
            key={filters.q ?? ''}
            initial={filters.q ?? ''}
            label="Buscar tienda"
            placeholder="Buscar tienda por nombre o ciudad"
            onSearch={handleSearch}
          />
          <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <span className="sr-only">Centro comercial (próximamente)</span>
            <select
              disabled
              aria-label="Centro comercial (próximamente)"
              title="Próximamente"
              className="h-12 w-full cursor-not-allowed rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-outline opacity-70 lg:w-64"
            >
              <option>Centros comerciales · Próximamente</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <span className="hidden sm:inline">Ordenar:</span>
            <select
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value })}
              aria-label="Ordenar tiendas"
              className="h-12 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25 lg:w-48"
            >
              {STORE_SORTS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filters.q && filters.q.length < MIN_SEARCH_LENGTH && (
          <p role="status" className="px-1 text-body-sm text-on-surface-variant">
            Escribe al menos {MIN_SEARCH_LENGTH} letras para buscar.
          </p>
        )}

        <div
          role="group"
          aria-label="Filtrar por ciudad"
          className="flex flex-wrap items-center gap-space-xs"
        >
          <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-outline">
            Ciudad
          </span>
          {cityChip('', 'Todas', total)}
          {cities.map(([name, count]) => cityChip(name, name, count))}
        </div>
      </div>

      <section aria-label="Tiendas" aria-busy={refreshing} className="space-y-space-md">
        {list.isPending && (
          <div className={gridClass} role="status" aria-label="Cargando tiendas">
            {Array.from({ length: 6 }, (_, index) => (
              <StoreCardSkeleton key={index} />
            ))}
          </div>
        )}

        {list.isError && (
          <ErrorNotice message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
        )}

        {list.isSuccess && stores.length === 0 && hasFilters && <EmptyState onClear={clear} />}
        {list.isSuccess && stores.length === 0 && !hasFilters && (
          <p className="rounded-2xl bg-surface-container p-6 text-body-md text-on-surface-variant">
            Aún no hay comercios verificados para mostrar.
          </p>
        )}

        {stores.length > 0 && (
          <>
            <p role="status" className="tnum text-body-sm text-on-surface-variant">
              Mostrando {stores.length} {stores.length === 1 ? 'tienda' : 'tiendas'}
              {capped && !hasFilters ? ' (las primeras 50)' : ''}
            </p>
            <ul
              className={`${gridClass} transition-opacity motion-reduce:transition-none ${
                refreshing ? 'opacity-60' : ''
              }`}
            >
              {stores.map((store) => (
                <li key={store.id} className="list-none">
                  <StoreCard store={store} detailed />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section
        aria-labelledby="protocolo-title"
        className="flex flex-col justify-between gap-space-md rounded-2xl bg-surface-container p-space-md md:flex-row md:items-center"
      >
        <div className="flex items-start gap-space-sm">
          <Icon name="shield" className="mt-0.5 text-[24px] text-outline" />
          <div>
            <h2 id="protocolo-title" className="text-headline-sm text-on-surface">
              Protocolo de verificación
            </h2>
            <p className="max-w-2xl text-body-sm text-on-surface-variant">
              Cada comercio envía sus documentos y un administrador los revisa antes de publicar sus
              ofertas.
            </p>
          </div>
        </div>
        <ComingSoonButton
          icon="fact_check"
          label="Criterios de verificación"
          className="h-14 shrink-0 border border-outline-variant px-4 text-on-surface"
        />
      </section>
    </Container>
  );
}
