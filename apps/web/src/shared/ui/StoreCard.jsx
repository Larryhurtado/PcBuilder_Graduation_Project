import { Link } from 'react-router';
import { formatLocation, initials } from '../lib/format.js';
import Icon from './Icon.jsx';
import StoreWhatsAppLink from './StoreWhatsAppLink.jsx';

/** Versión del directorio: iniciales, ubicación completa, ofertas activas, catálogo y WhatsApp. */
function DetailedStoreCard({ store }) {
  const offers = store.offersCount;
  return (
    <article className="flex h-full flex-col justify-between gap-space-md rounded-2xl bg-surface-container p-space-md">
      <div className="space-y-space-md">
        <div className="flex items-start gap-space-sm">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-label-md text-primary"
          >
            {initials(store.name)}
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="text-headline-sm leading-snug text-on-surface">{store.name}</h3>
            <span className="inline-flex items-center gap-1 rounded bg-compatible/12 px-2 py-0.5 text-[11px] font-medium text-compatible">
              <Icon name="verified" className="text-[13px]" />
              Comercio verificado
            </span>
          </div>
        </div>

        <ul className="space-y-1 text-body-sm text-on-surface-variant">
          {store.commercialCenter && (
            <li className="flex items-start gap-1.5">
              <Icon name="apartment" className="mt-0.5 text-[16px] text-outline" />
              <span>{store.commercialCenter}</span>
            </li>
          )}
          <li className="flex items-start gap-1.5">
            <Icon name="location_on" className="mt-0.5 text-[16px] text-outline" />
            <span>{[store.address, formatLocation(store)].filter(Boolean).join(' • ')}</span>
          </li>
        </ul>

        <p className="tnum flex items-baseline justify-between rounded-xl bg-surface px-space-sm py-2 text-body-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
            Inventario vigente
          </span>
          <span className="text-label-md text-secondary">
            {offers} {offers === 1 ? 'oferta activa' : 'ofertas activas'}
          </span>
        </p>

        {store.description && (
          <p className="line-clamp-3 text-body-sm text-on-surface-variant">{store.description}</p>
        )}
      </div>

      <div className="flex gap-space-xs">
        <Link
          to={`/tiendas/${store.id}`}
          aria-label={`Ver tienda y catálogo de ${store.name}`}
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-outline-variant px-3 text-label-md text-on-surface transition-colors hover:border-outline hover:bg-surface-variant"
        >
          <span aria-hidden="true" className="sm:hidden">
            Ver tienda
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            Ver tienda y catálogo
          </span>
        </Link>
        <StoreWhatsAppLink store={store} />
      </div>
    </article>
  );
}

/**
 * Tarjeta de comercio verificado. GET /stores solo devuelve comercios verificados, así que la
 * insignia se muestra siempre. `detailed` es la versión del directorio.
 * @param {{ store: import('zod').infer<typeof import('@hw/contracts').publicStoreSchema>, detailed?: boolean }} props
 */
export default function StoreCard({ store, detailed = false }) {
  if (detailed) return <DetailedStoreCard store={store} />;
  const location = [formatLocation(store), store.address].filter(Boolean).join(' • ');

  return (
    <article className="flex flex-col justify-between rounded-2xl bg-surface-container p-6">
      <div>
        <div className="mb-space-sm flex items-center justify-between gap-space-sm">
          <h3 className="text-headline-md text-on-surface">{store.name}</h3>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-variant text-secondary">
            <Icon name="store" className="text-[18px]" />
          </span>
        </div>

        <p className="mb-space-md flex items-start gap-1.5 text-body-sm text-on-surface-variant">
          <Icon name="location_on" className="text-[18px] text-outline" />
          <span>{location}</span>
        </p>

        <div className="mb-space-md flex flex-wrap gap-space-xs">
          <span className="flex items-center gap-1 rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-compatible">
            <Icon name="verified" className="text-[14px]" />
            <span>Comercio Verificado</span>
          </span>
        </div>

        {store.description && (
          <div className="mb-space-lg rounded-xl bg-surface-container-low p-space-sm">
            <span className="mb-1 block text-label-sm text-outline">Especialidades</span>
            <p className="text-body-sm text-on-surface">{store.description}</p>
          </div>
        )}
      </div>

      <Link
        to={`/tiendas/${store.id}`}
        className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary transition-colors hover:text-primary-fixed md:min-h-0"
      >
        <span>Ver catálogo de tienda</span>
        <Icon name="arrow_forward" className="text-[16px]" />
      </Link>
    </article>
  );
}

/** Marcador de carga con las mismas proporciones que la tarjeta. */
export function StoreCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse flex-col gap-space-md rounded-2xl bg-surface-container p-6 motion-reduce:animate-none"
    >
      <div className="h-7 w-2/3 rounded bg-surface-variant" />
      <div className="h-4 w-full rounded bg-surface-variant" />
      <div className="h-7 w-40 rounded-lg bg-surface-variant" />
      <div className="h-20 rounded-xl bg-surface-container-low" />
    </div>
  );
}
