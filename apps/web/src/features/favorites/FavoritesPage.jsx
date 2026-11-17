import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { notify } from '../../shared/notices.js';
import { useSession } from '../../shared/session/useSession.js';
import { categoryLabels } from '../../shared/lib/specs.js';
import ButtonLink from '../../shared/ui/ButtonLink.jsx';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import ConfirmDialog from '../../shared/ui/ConfirmDialog.jsx';
import Container from '../../shared/ui/Container.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import SearchField from '../../shared/ui/SearchField.jsx';
import AccountSidebar from '../account/AccountSidebar.jsx';
import { useBuildStore } from '../builder/store.js';
import { restoreBuild } from '../builds/restore.js';
import FavoriteCard, { FavoriteCardSkeleton } from './FavoriteCard.jsx';
import { useFavorites } from './useFavorites.js';

const SORTS = [
  ['recent', 'Agregados recientemente'],
  ['price_asc', 'Menor precio'],
  ['name', 'Nombre (A–Z)'],
];

/** Las piezas sin precio (sin ofertas) van al final al ordenar por precio. */
const sorters = {
  recent: (a, b) => b.addedAt.localeCompare(a.addedAt),
  price_asc: (a, b) =>
    (a.minPriceCop ?? Number.POSITIVE_INFINITY) - (b.minPriceCop ?? Number.POSITIVE_INFINITY) ||
    a.displayName.localeCompare(b.displayName, 'es'),
  name: (a, b) => a.displayName.localeCompare(b.displayName, 'es'),
};

const gridClass = 'grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-3';

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center gap-space-sm rounded-2xl bg-surface-container px-space-md py-space-2xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-secondary">
        <Icon name={hasFilters ? 'search_off' : 'favorite'} className="text-[28px]" />
      </span>
      <h2 className="text-headline-sm text-on-surface">
        {hasFilters ? 'Ningún favorito coincide' : 'Aún no tienes favoritos'}
      </h2>
      <p className="max-w-md text-body-sm text-on-surface-variant">
        {hasFilters
          ? 'Prueba con otra búsqueda o con otra categoría.'
          : 'Toca el corazón en cualquier pieza del catálogo para guardarla aquí y seguir su precio.'}
      </p>
      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-space-xs h-11 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
        >
          Quitar los filtros
        </button>
      ) : (
        <ButtonLink to="/catalogo" variant="primary" className="mt-space-xs">
          Explorar el catálogo
        </ButtonLink>
      )}
    </div>
  );
}

/** Favoritos (/cuenta/favoritos): los componentes guardados, con su precio mínimo y sus ofertas. */
export default function FavoritesPage() {
  const { user } = useSession();
  const { query, removeMany } = useFavorites();
  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const parts = useBuildStore((state) => state.parts);
  const setPart = useBuildStore((state) => state.setPart);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recent');
  const [addingId, setAddingId] = useState(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    document.title = `Mis favoritos · ${PLATFORM_NAME}`;
  }, []);

  const counts = useMemo(() => {
    const result = {};
    for (const item of items) result[item.category] = (result[item.category] ?? 0) + 1;
    return result;
  }, [items]);
  // Si se quita el último favorito de una categoría, el filtro deja de aplicar
  const activeCategory = counts[category] ? category : '';

  const needle = q.toLowerCase();
  const visible = items
    .filter((item) => !activeCategory || item.category === activeCategory)
    .filter(
      (item) =>
        !needle || `${item.displayName} ${item.brand} ${item.model}`.toLowerCase().includes(needle),
    )
    .sort(sorters[sort]);
  const withOffers = items.filter((item) => item.offersCount > 0).length;

  const handleAdd = async (item) => {
    setAddingId(item.componentId);
    try {
      const { parts: restored } = await restoreBuild([
        {
          category: item.category,
          componentId: item.componentId,
          offerId: null,
          displayName: item.displayName,
        },
      ]);
      const offer = restored[item.category];
      if (!offer) {
        notify({ tone: 'error', message: `${item.displayName} no tiene ofertas vigentes hoy.` });
        return;
      }
      const previous = parts[item.category];
      setPart(offer);
      notify({
        message: previous
          ? `${item.displayName} reemplazó a ${previous.component.displayName} en tu armado.`
          : `${item.displayName} se agregó a tu armado.`,
        action: { label: 'Ver armador', to: '/armador' },
      });
    } catch (error) {
      notify({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setAddingId(null);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    const removed = await removeMany(items.map((item) => ({ id: item.componentId })));
    setClearing(false);
    setConfirmingClear(false);
    notify(
      removed === items.length
        ? { message: 'Tu lista de favoritos quedó vacía.' }
        : {
            tone: 'error',
            message: `Se quitaron ${removed} de ${items.length} favoritos. Inténtalo de nuevo con los que quedan.`,
          },
    );
  };

  const chip = (value, label, count) => (
    <button
      key={value || 'all'}
      type="button"
      aria-pressed={activeCategory === value}
      onClick={() => setCategory(value)}
      className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
    >
      {label}
      <span className="tnum text-label-sm opacity-80">{count}</span>
    </button>
  );

  if (!user) return null;

  return (
    <Container size="wide" className="space-y-space-lg py-space-lg">
      <nav aria-label="Ruta de navegación" className="text-body-sm text-on-surface-variant">
        <ol className="flex flex-wrap items-center gap-x-2">
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
          <li>
            <Link
              to="/cuenta"
              className="inline-flex min-h-11 items-center hover:text-on-surface hover:underline md:min-h-0"
            >
              Mi cuenta
            </Link>
          </li>
          <li aria-hidden="true" className="text-outline-variant">
            /
          </li>
          <li aria-current="page" className="text-on-surface">
            Componentes favoritos
          </li>
        </ol>
      </nav>

      <div className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
        <div className="space-y-space-xs">
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Mis componentes favoritos
          </h1>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            Las piezas que guardaste, con el precio más bajo de las tiendas verificadas. Agrégalas
            al asistente cuando estés listo para armar.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-space-xs">
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={items.length === 0}
            className="flex h-14 items-center gap-1.5 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Icon name="delete_sweep" className="text-[18px]" />
            Limpiar lista
          </button>
          <ComingSoonButton
            icon="notifications"
            label="Gestionar alertas"
            className="h-14 border border-outline-variant px-4 text-on-surface"
          />
        </div>
      </div>

      <div className="grid items-start gap-space-lg lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside aria-label="Perfil" className="space-y-space-md lg:sticky lg:top-20">
          <AccountSidebar user={user} current="wishlist" />
          {items.length > 0 && (
            <div className="space-y-1 rounded-2xl bg-surface-container p-space-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                Resumen de favoritos
              </p>
              <p className="tnum text-headline-sm font-bold text-on-surface">
                {items.length} {items.length === 1 ? 'pieza' : 'piezas'}
              </p>
              <p className="tnum text-body-sm text-on-surface-variant">
                {withOffers} de {items.length} con ofertas hoy
              </p>
            </div>
          )}
        </aside>

        <section aria-label="Favoritos" className="min-w-0 space-y-space-md">
          {items.length > 0 && (
            <div className="space-y-space-sm rounded-2xl bg-surface-container p-space-sm">
              <div className="flex flex-col gap-space-sm md:flex-row md:items-center">
                <SearchField
                  initial={q}
                  label="Buscar en tus favoritos"
                  placeholder="Filtrar favoritos por nombre o marca"
                  onSearch={setQ}
                />
                <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
                  <span className="hidden sm:inline">Ordenar:</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    aria-label="Ordenar favoritos"
                    className="h-12 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25 md:w-56"
                  >
                    {SORTS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div
                role="group"
                aria-label="Filtrar por categoría"
                className="flex flex-wrap gap-space-xs"
              >
                {chip('', 'Todos', items.length)}
                {Object.keys(counts).map((key) =>
                  chip(key, categoryLabels[key] ?? key, counts[key]),
                )}
              </div>
            </div>
          )}

          {query.isPending && (
            <div className={gridClass} role="status" aria-label="Cargando favoritos">
              {[0, 1, 2].map((index) => (
                <FavoriteCardSkeleton key={index} />
              ))}
            </div>
          )}

          {query.isError && (
            <ErrorNotice message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
          )}

          {query.isSuccess && items.length === 0 && <EmptyState />}

          {items.length > 0 && visible.length === 0 && (
            <EmptyState
              hasFilters
              onClear={() => {
                setQ('');
                setCategory('');
              }}
            />
          )}

          {visible.length > 0 && (
            <ul className={gridClass}>
              {visible.map((item) => {
                const current = parts[item.category];
                const inBuild = current?.component.id === item.componentId;
                return (
                  <li key={item.componentId} className="list-none">
                    <FavoriteCard
                      item={item}
                      inBuild={inBuild}
                      replaces={Boolean(current) && !inBuild}
                      adding={addingId === item.componentId}
                      onAdd={() => handleAdd(item)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmingClear}
        title="¿Vaciar tu lista de favoritos?"
        message={`Se quitarán ${items.length} ${items.length === 1 ? 'pieza' : 'piezas'} de tu lista. Podrás volver a guardarlas desde el catálogo.`}
        confirmLabel="Vaciar lista"
        busyLabel="Quitando…"
        busy={clearing}
        danger
        onConfirm={handleClear}
        onClose={() => setConfirmingClear(false)}
      />
    </Container>
  );
}
