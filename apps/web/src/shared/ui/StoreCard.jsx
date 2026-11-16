import { Link } from 'react-router';
import { formatLocation } from '../lib/format.js';
import Icon from './Icon.jsx';

/**
 * Tarjeta de comercio verificado (inicio, directorio).
 * @param {{ store: import('zod').infer<typeof import('../api/schemas.js').storeCardSchema> }} props
 */
export default function StoreCard({ store }) {
  const location = [formatLocation(store), store.address].filter(Boolean).join(' • ');

  return (
    <article className="flex flex-col justify-between rounded-2xl bg-surface-container p-6">
      <div>
        <div className="mb-space-sm flex items-center justify-between gap-space-sm">
          <h3 className="text-headline-md text-on-surface">{store.tradeName}</h3>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-variant text-secondary">
            <Icon name="store" className="text-[18px]" />
          </span>
        </div>

        <p className="mb-space-md flex items-start gap-1.5 text-body-sm text-on-surface-variant">
          <Icon name="location_on" className="text-[18px] text-outline" />
          <span>{location}</span>
        </p>

        {store.isVerified && (
          <div className="mb-space-md flex flex-wrap gap-space-xs">
            <span className="flex items-center gap-1 rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-compatible">
              <Icon name="verified" className="text-[14px]" />
              <span>Comercio Verificado</span>
            </span>
          </div>
        )}

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
