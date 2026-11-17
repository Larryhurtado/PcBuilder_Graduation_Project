import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { formatCOP } from '../../shared/lib/format.js';
import { categoryLabels, keyMetrics, specLine } from '../../shared/lib/specs.js';
import ButtonLink from '../../shared/ui/ButtonLink.jsx';
import Container from '../../shared/ui/Container.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import OfferImage from '../../shared/ui/OfferImage.jsx';
import Toast from '../../shared/ui/Toast.jsx';
import { useBuildStore } from '../builder/store.js';
import { ShareButton } from '../catalog/OfferActions.jsx';
import FavoriteButton from '../favorites/FavoriteButton.jsx';
import CompatBanner from './CompatBanner.jsx';
import ProductOffers from './ProductOffers.jsx';
import { useComponent, useComponentOffers } from './queries.js';
import SpecsTable from './SpecsTable.jsx';

function Breadcrumb({ component }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-body-sm text-on-surface-variant">
      <ol className="flex flex-wrap items-center gap-x-2">
        <li>
          <Link
            to="/catalogo"
            className="inline-flex min-h-11 items-center hover:text-on-surface hover:underline md:min-h-0"
          >
            Catálogo
          </Link>
        </li>
        {component && (
          <>
            <li aria-hidden="true" className="text-outline-variant">
              /
            </li>
            <li>
              <Link
                to={`/catalogo?category=${component.category}`}
                className="inline-flex min-h-11 items-center hover:text-on-surface hover:underline md:min-h-0"
              >
                {categoryLabels[component.category]}
              </Link>
            </li>
            <li aria-hidden="true" className="text-outline-variant">
              /
            </li>
            <li aria-current="page" className="text-on-surface">
              {component.displayName}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}

function PageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando producto"
      className="grid animate-pulse gap-space-lg motion-reduce:animate-none lg:grid-cols-[22rem_minmax(0,1fr)]"
    >
      <div className="h-96 rounded-2xl bg-surface-container" />
      <div className="space-y-space-md">
        <div className="h-10 w-2/3 rounded bg-surface-variant" />
        <div className="h-16 rounded-2xl bg-surface-container" />
        <div className="h-72 rounded-2xl bg-surface-container" />
      </div>
    </div>
  );
}

function Alternatives() {
  return (
    <section
      aria-labelledby="alternatives-title"
      className="flex flex-wrap items-center justify-between gap-space-sm rounded-2xl bg-surface-container p-space-md"
    >
      <div className="flex items-start gap-space-sm">
        <Icon name="compare_arrows" className="mt-0.5 text-[24px] text-outline" />
        <div>
          <h2 id="alternatives-title" className="text-headline-sm text-on-surface">
            Alternativas directas
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Pronto podrás comparar piezas equivalentes con ofertas en Colombia.
          </p>
        </div>
      </div>
      <span className="rounded-full bg-surface px-3 py-1 text-label-sm text-on-surface-variant">
        Próximamente
      </span>
    </section>
  );
}

/** Ficha del producto (/producto/:id): especificaciones, compatibilidad con tu armado y ofertas. */
export default function ProductPage() {
  const { id } = useParams();
  const componentQuery = useComponent(id);
  const offersQuery = useComponentOffers(id);
  const parts = useBuildStore((state) => state.parts);
  const setPart = useBuildStore((state) => state.setPart);

  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const component = componentQuery.data;

  useEffect(() => {
    document.title = `${component?.displayName ?? 'Producto'} · ${PLATFORM_NAME}`;
  }, [component?.displayName]);

  // Las ofertas del listado no traen especificaciones: se completan con las de la ficha
  const offers = useMemo(
    () =>
      component && offersQuery.data
        ? offersQuery.data.items.map((offer) => ({
            ...offer,
            component: { ...offer.component, specs: component.specs },
          }))
        : [],
    [component, offersQuery.data],
  );
  const best = offers[0];
  const stores = new Set(offers.map((offer) => offer.store.id)).size;

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

  if (componentQuery.isPending) {
    return (
      <Container size="wide" className="space-y-space-lg py-space-lg">
        <Breadcrumb />
        <PageSkeleton />
      </Container>
    );
  }

  if (componentQuery.isError) {
    const notFound =
      componentQuery.error instanceof ApiError && componentQuery.error.status === 404;
    return (
      <Container size="wide" className="space-y-space-lg py-space-lg">
        <Breadcrumb />
        {notFound ? (
          <div className="flex flex-col items-start gap-space-md rounded-2xl bg-surface-container p-space-xl">
            <Icon name="search_off" className="text-[32px] text-secondary" />
            <h1 className="text-headline-md text-on-surface">Este producto no está disponible</h1>
            <p className="max-w-xl text-body-md text-on-surface-variant">
              Puede que el enlace esté roto o que la pieza ya no esté en el catálogo.
            </p>
            <ButtonLink to="/catalogo" variant="primary">
              Ver el catálogo
            </ButtonLink>
          </div>
        ) : (
          <ErrorNotice
            message={getErrorMessage(componentQuery.error)}
            onRetry={() => componentQuery.refetch()}
          />
        )}
      </Container>
    );
  }

  const inBuild = best && parts[component.category]?.offerId === best.offerId;
  const replaces = best && Boolean(parts[component.category]) && !inBuild;
  const metrics = keyMetrics(component.category, component.specs);
  const line = specLine(component.category, component.specs);

  return (
    <Container size="wide" className="space-y-space-xl py-space-lg">
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <Breadcrumb component={component} />
        <div className="flex gap-space-xs">
          <ShareButton name={component.displayName} />
          <FavoriteButton
            component={{ ...component, minPriceCop: best?.priceCop, offersCount: offers.length }}
          />
        </div>
      </div>

      <div className="grid items-start gap-space-lg lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-space-md lg:sticky lg:top-20">
          <OfferImage
            offer={best ?? { coverImageUrl: null, component }}
            className="h-44 md:h-64"
            iconClassName="h-24 w-24"
          />

          {metrics.length > 0 && (
            <dl className="grid grid-cols-2 gap-space-xs">
              {metrics.map((metric) => (
                <div key={metric.key} className="rounded-xl bg-surface-container p-space-sm">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                    {metric.label}
                  </dt>
                  <dd className="tnum text-label-md text-on-surface">{metric.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="space-y-space-sm rounded-2xl bg-surface-container p-space-md">
            {offersQuery.isPending ? (
              <p className="text-body-sm text-on-surface-variant">Buscando ofertas…</p>
            ) : best ? (
              <>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-outline">
                    Mejor cotización en Colombia
                  </span>
                  <span className="tnum text-headline-md font-bold text-on-surface">
                    {formatCOP(best.priceCop)}
                  </span>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  {offers.length} {offers.length === 1 ? 'oferta' : 'ofertas'} en {stores}{' '}
                  {stores === 1 ? 'tienda' : 'tiendas'}
                </p>
                {inBuild ? (
                  <div className="flex items-center justify-between gap-space-sm rounded-xl bg-surface px-space-md py-3">
                    <span className="flex items-center gap-1.5 text-label-md text-compatible">
                      <Icon name="check_circle" className="text-[20px]" />
                      En tu armado
                    </span>
                    <Link to="/armador" className="text-label-sm text-primary hover:underline">
                      Ver armador
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAdd(best)}
                    aria-label={`${replaces ? 'Cambiar en el armado por' : 'Agregar al armado'} ${component.displayName}`}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
                  >
                    <Icon name={replaces ? 'swap_horiz' : 'add_circle'} className="text-[20px]" />
                    {replaces ? 'Reemplazar en el armado' : 'Agregar al armado'}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-label-md text-on-surface">Sin ofertas por ahora</p>
                <p className="text-body-sm text-on-surface-variant">
                  Ninguna tienda verificada publica esta pieza en este momento.
                </p>
              </>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-space-md">
          <div className="space-y-space-xs">
            <p className="text-label-sm uppercase tracking-wider text-outline">
              {component.brand}
              {component.releaseYear ? ` • ${component.releaseYear}` : ''}
            </p>
            <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
              {component.displayName}
            </h1>
            {line && <p className="tnum text-body-md text-on-surface-variant">{line}</p>}
          </div>

          <CompatBanner component={component} parts={parts} />
          <SpecsTable component={component} />
        </div>
      </div>

      <section aria-labelledby="offers-title" className="space-y-space-md">
        <div className="space-y-1">
          <h2 id="offers-title" className="text-headline-md text-on-surface">
            Ofertas verificadas en Colombia
            {offersQuery.isSuccess && offers.length > 0 && (
              <span className="tnum text-on-surface-variant"> ({offers.length})</span>
            )}
          </h2>
          <p className="max-w-2xl text-body-sm text-on-surface-variant">
            Precios publicados por tiendas verificadas. Contacta directamente a la tienda por
            WhatsApp.
          </p>
        </div>

        {offersQuery.isPending && (
          <div
            role="status"
            aria-label="Cargando ofertas"
            className="h-32 animate-pulse rounded-2xl bg-surface-container motion-reduce:animate-none"
          />
        )}
        {offersQuery.isError && (
          <ErrorNotice
            message={getErrorMessage(offersQuery.error)}
            onRetry={() => offersQuery.refetch()}
          />
        )}
        {offersQuery.isSuccess && offers.length === 0 && (
          <div className="flex flex-col items-start gap-space-sm rounded-2xl bg-surface-container p-space-lg">
            <h3 className="text-headline-sm text-on-surface">
              Esta pieza no tiene ofertas vigentes
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Explora otras piezas de la categoría o vuelve más tarde.
            </p>
            <ButtonLink to={`/catalogo?category=${component.category}`} variant="secondary">
              Ver {categoryLabels[component.category].toLowerCase()}
            </ButtonLink>
          </div>
        )}
        {offers.length > 0 && <ProductOffers offers={offers} parts={parts} onAdd={handleAdd} />}
      </section>

      <Alternatives />

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
