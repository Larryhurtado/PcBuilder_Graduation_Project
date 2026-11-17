import { componentCategories } from '@hw/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { formatLocation, formatPhone, initials } from '../../shared/lib/format.js';
import { categoryLabels } from '../../shared/lib/specs.js';
import ButtonLink from '../../shared/ui/ButtonLink.jsx';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import Container from '../../shared/ui/Container.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import SearchField from '../../shared/ui/SearchField.jsx';
import StoreWhatsAppLink from '../../shared/ui/StoreWhatsAppLink.jsx';
import Toast from '../../shared/ui/Toast.jsx';
import { useBuildStore } from '../builder/store.js';
import CatalogCard, { CatalogCardSkeleton } from '../catalog/CatalogCard.jsx';
import { useStore, useStoreOffers } from './queries.js';
import { OFFER_SORTS, useStoreOfferFilters } from './useStoreOfferFilters.js';

const gridClass = 'grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3';

function Breadcrumb({ name }) {
  return (
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
            to="/tiendas"
            className="inline-flex min-h-11 items-center hover:text-on-surface hover:underline md:min-h-0"
          >
            Tiendas
          </Link>
        </li>
        {name && (
          <>
            <li aria-hidden="true" className="text-outline-variant">
              /
            </li>
            <li aria-current="page" className="text-on-surface">
              {name}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}

function ContactItem({ icon, label, children }) {
  return (
    <div className="flex items-start gap-space-sm rounded-xl bg-surface p-space-sm">
      <Icon name={icon} className="mt-0.5 text-[20px] text-outline" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">{label}</p>
        <div className="text-body-sm text-on-surface">{children}</div>
      </div>
    </div>
  );
}

function ProfileHeader({ store }) {
  const phone = formatPhone(store.whatsappE164);
  const location = formatLocation(store);

  return (
    <div className="grid gap-space-md rounded-2xl bg-surface-container p-space-md lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-space-lg">
      <div className="space-y-space-md">
        <div className="flex items-start gap-space-md">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface text-headline-sm text-primary"
          >
            {initials(store.name)}
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
              {store.name}
            </h1>
            <span className="inline-flex items-center gap-1 rounded bg-compatible/12 px-2 py-0.5 text-[11px] font-medium text-compatible">
              <Icon name="verified" className="text-[13px]" />
              Comercio verificado
            </span>
          </div>
        </div>

        {store.description && (
          <p className="max-w-3xl text-body-md text-on-surface-variant">{store.description}</p>
        )}

        <div className="grid gap-space-xs sm:grid-cols-2">
          {(store.commercialCenter || store.address || location) && (
            <ContactItem icon="location_on" label="Ubicación">
              {store.commercialCenter && <p>{store.commercialCenter}</p>}
              {store.address && <p className="text-on-surface-variant">{store.address}</p>}
              {location && <p className="text-on-surface-variant">{location}</p>}
            </ContactItem>
          )}
          <ContactItem icon="call" label="WhatsApp">
            {phone ? (
              <p className="tnum">{phone}</p>
            ) : (
              <p className="text-outline">No disponible</p>
            )}
          </ContactItem>
        </div>

        <div className="flex flex-wrap gap-space-xs">
          <StoreWhatsAppLink store={store} className="px-5" />
          <button
            type="button"
            disabled
            title="Compartir: próximamente"
            className="flex h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface opacity-60"
          >
            <Icon name="share" className="text-[18px]" />
            Compartir perfil (próximamente)
          </button>
        </div>
      </div>

      <aside
        aria-label="Resumen de la tienda"
        className="space-y-space-sm rounded-2xl bg-surface p-space-md"
      >
        <p className="flex items-center gap-1.5 text-label-md text-on-surface">
          <Icon name="verified_user" className="text-[18px] text-secondary" />
          Comercio verificado
        </p>
        <p className="tnum">
          <span className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            {store.offersCount}
          </span>{' '}
          <span className="text-label-sm text-secondary">
            {store.offersCount === 1 ? 'oferta activa' : 'ofertas activas'}
          </span>
        </p>
        <p className="text-body-sm text-on-surface-variant">
          Confirmamos que el comercio existe. No garantizamos el cumplimiento de sus ofertas.
        </p>
      </aside>
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="flex flex-col items-center gap-space-sm rounded-2xl bg-surface-container px-space-md py-space-2xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-secondary">
        <Icon name="search_off" className="text-[28px]" />
      </span>
      <h3 className="text-headline-sm text-on-surface">
        {hasFilters
          ? 'Esta tienda no tiene ofertas con esos filtros'
          : 'Esta tienda no tiene ofertas activas'}
      </h3>
      <p className="max-w-md text-body-sm text-on-surface-variant">
        {hasFilters
          ? 'Prueba con otra categoría o con otra búsqueda.'
          : 'Vuelve pronto o explora otras tiendas verificadas.'}
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
        <ButtonLink to="/tiendas" variant="secondary">
          Ver otras tiendas
        </ButtonLink>
      )}
    </div>
  );
}

/** Perfil público de una tienda (/tiendas/:id): datos de contacto y su catálogo de ofertas. */
export default function StoreProfilePage() {
  const { id } = useParams();
  const storeQuery = useStore(id);
  const { filters, update, clear } = useStoreOfferFilters();
  const offersQuery = useStoreOffers(id, filters);
  const parts = useBuildStore((state) => state.parts);
  const setPart = useBuildStore((state) => state.setPart);

  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const store = storeQuery.data;

  useEffect(() => {
    document.title = `${store?.name ?? 'Tienda'} · ${PLATFORM_NAME}`;
  }, [store?.name]);

  const handleSearch = useCallback((q) => update({ q }, { replace: true }), [update]);

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

  const offers = useMemo(
    () => offersQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [offersQuery.data],
  );
  const hasFilters = Boolean(filters.category || filters.q);
  const refreshing = offersQuery.isPlaceholderData;

  if (storeQuery.isPending) {
    return (
      <Container size="wide" className="space-y-space-lg py-space-lg">
        <Breadcrumb />
        <div
          role="status"
          aria-label="Cargando tienda"
          className="h-72 animate-pulse rounded-2xl bg-surface-container motion-reduce:animate-none"
        />
      </Container>
    );
  }

  if (storeQuery.isError) {
    const notFound = storeQuery.error instanceof ApiError && storeQuery.error.status === 404;
    return (
      <Container size="wide" className="space-y-space-lg py-space-lg">
        <Breadcrumb />
        {notFound ? (
          <div className="flex flex-col items-start gap-space-md rounded-2xl bg-surface-container p-space-xl">
            <Icon name="storefront" className="text-[32px] text-secondary" />
            <h1 className="text-headline-md text-on-surface">Esta tienda no está disponible</h1>
            <p className="max-w-xl text-body-md text-on-surface-variant">
              Puede que el enlace esté roto o que la tienda ya no figure entre los comercios
              verificados.
            </p>
            <ButtonLink to="/tiendas" variant="primary">
              Ver todas las tiendas
            </ButtonLink>
          </div>
        ) : (
          <ErrorNotice
            message={getErrorMessage(storeQuery.error)}
            onRetry={() => storeQuery.refetch()}
          />
        )}
      </Container>
    );
  }

  const chip = (value, label) => (
    <button
      key={value || 'all'}
      type="button"
      aria-pressed={(filters.category ?? '') === value}
      onClick={() => update({ category: value })}
      className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-container px-4 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
    >
      {value && <CategoryIcon category={value} className="h-4 w-4" />}
      {label}
    </button>
  );

  return (
    <Container size="wide" className="space-y-space-lg py-space-lg">
      <Breadcrumb name={store.name} />
      <ProfileHeader store={store} />

      <section aria-labelledby="catalogo-tienda-title" className="space-y-space-md">
        <div className="space-y-1">
          <h2 id="catalogo-tienda-title" className="text-headline-md text-on-surface">
            Ofertas de la tienda
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Precios publicados por {store.name}. Contacta directamente a la tienda por WhatsApp.
          </p>
        </div>

        <div className="space-y-space-sm rounded-2xl bg-surface-container p-space-sm">
          <div className="flex flex-col gap-space-sm md:flex-row md:items-center">
            <SearchField
              key={filters.q ?? ''}
              initial={filters.q ?? ''}
              label="Buscar en el inventario de la tienda"
              placeholder={`Buscar en ${store.name}`}
              onSearch={handleSearch}
            />
            <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
              <span className="hidden sm:inline">Ordenar:</span>
              <select
                value={filters.sort}
                onChange={(event) => update({ sort: event.target.value })}
                aria-label="Ordenar ofertas de la tienda"
                className="h-12 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25 md:w-48"
              >
                {OFFER_SORTS.map(([value, label]) => (
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
            {chip('', 'Todas')}
            {componentCategories.map((category) => chip(category, categoryLabels[category]))}
          </div>
        </div>

        <div aria-busy={refreshing} className="space-y-space-md">
          {offersQuery.isPending && (
            <div className={gridClass} role="status" aria-label="Cargando ofertas">
              {Array.from({ length: 6 }, (_, index) => (
                <CatalogCardSkeleton key={index} />
              ))}
            </div>
          )}

          {offersQuery.isError && (
            <ErrorNotice
              message={getErrorMessage(offersQuery.error)}
              onRetry={() => offersQuery.refetch()}
            />
          )}

          {offersQuery.isSuccess && offers.length === 0 && (
            <EmptyState hasFilters={hasFilters} onClear={clear} />
          )}

          {offers.length > 0 && (
            <>
              <p role="status" className="tnum text-body-sm text-on-surface-variant">
                Mostrando {offers.length} {offers.length === 1 ? 'oferta' : 'ofertas'}
                {offersQuery.hasNextPage ? ' (hay más)' : ''}
              </p>
              <ul
                className={`${gridClass} transition-opacity motion-reduce:transition-none ${
                  refreshing ? 'opacity-60' : ''
                }`}
              >
                {offers.map((offer) => {
                  const inBuild = parts[offer.component.category]?.offerId === offer.offerId;
                  return (
                    <li key={offer.offerId} className="list-none">
                      <CatalogCard
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

          {offersQuery.hasNextPage && (
            <button
              type="button"
              onClick={() => offersQuery.fetchNextPage()}
              disabled={offersQuery.isFetchingNextPage}
              className="h-12 w-full rounded-xl border border-outline-variant text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-60"
            >
              {offersQuery.isFetchingNextPage ? 'Cargando…' : 'Cargar más ofertas'}
            </button>
          )}
        </div>
      </section>

      <section
        aria-labelledby="politica-title"
        className="flex flex-col justify-between gap-space-md rounded-2xl bg-surface-container p-space-md md:flex-row md:items-center"
      >
        <div className="flex items-start gap-space-sm">
          <Icon name="verified_user" className="mt-0.5 text-[24px] text-secondary" />
          <div>
            <h2 id="politica-title" className="text-headline-sm text-on-surface">
              Tiendas verificadas
            </h2>
            <p className="max-w-2xl text-body-sm text-on-surface-variant">
              Cada comercio envía sus documentos y un administrador los revisa antes de publicar
              ofertas. Los precios y la disponibilidad los define cada tienda.
            </p>
          </div>
        </div>
        <ButtonLink to="/tiendas" variant="secondary">
          Ver otros comercios
        </ButtonLink>
      </section>

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
