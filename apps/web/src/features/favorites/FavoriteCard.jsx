import { Link } from 'react-router';
import { formatCOP } from '../../shared/lib/format.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { slotByCategory } from '../builder/slots.js';
import FavoriteButton from './FavoriteButton.jsx';

/**
 * Tarjeta de un favorito. La lista solo trae lo básico de la pieza (nombre, categoría, precio
 * mínimo y cantidad de ofertas), así que no hay foto ni especificaciones: va el ícono de la categoría.
 * @param {{ item: import('zod').infer<typeof import('@hw/contracts').wishlistItemSchema>, inBuild: boolean, replaces: boolean, adding: boolean, onAdd: () => void }} props
 */
export default function FavoriteCard({ item, inBuild, replaces, adding, onAdd }) {
  const component = {
    id: item.componentId,
    category: item.category,
    brand: item.brand,
    model: item.model,
    displayName: item.displayName,
    minPriceCop: item.minPriceCop,
    offersCount: item.offersCount,
  };
  const hasOffers = item.offersCount > 0;
  const tag = slotByCategory[item.category]?.short ?? item.category;

  return (
    <article className="relative flex h-full flex-col justify-between gap-space-md rounded-2xl bg-surface-container p-space-md">
      <div className="space-y-space-md">
        <div className="flex items-center justify-between gap-space-sm">
          <p className="text-label-sm uppercase tracking-wider text-primary">{tag}</p>
          <FavoriteButton component={component} className="relative z-10 -my-2 -mr-2" />
        </div>

        <div className="flex h-32 items-center justify-center rounded-xl bg-surface-container-low">
          <CategoryIcon category={item.category} className="h-14 w-14 text-outline-variant" />
        </div>

        <div className="space-y-1">
          <h2 className="line-clamp-2 text-headline-sm leading-snug text-on-surface">
            <Link
              to={`/producto/${item.componentId}`}
              title={item.displayName}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
            >
              {item.displayName}
            </Link>
          </h2>
          <p className="truncate text-body-sm text-on-surface-variant">
            {item.brand} • {item.model}
          </p>
        </div>

        <p
          className={`flex items-center gap-1.5 text-body-sm ${hasOffers ? 'text-on-surface' : 'text-outline'}`}
        >
          <Icon name="storefront" className="text-[16px] text-tertiary" />
          {hasOffers
            ? `${item.offersCount} ${item.offersCount === 1 ? 'oferta' : 'ofertas'} en tiendas verificadas`
            : 'Sin ofertas por ahora'}
        </p>
      </div>

      <div className="space-y-space-sm">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-outline">
            {hasOffers ? 'Desde' : 'Precio'}
          </span>
          <span className="tnum text-headline-md font-bold text-on-surface">
            {formatCOP(item.minPriceCop)}
          </span>
        </div>
        <div className="relative z-10 flex gap-space-xs">
          {inBuild ? (
            <span className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface text-label-md text-compatible">
              <Icon name="check_circle" className="text-[18px]" />
              En tu armado
            </span>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={!hasOffers || adding}
              aria-label={`${replaces ? 'Cambiar en el armado por' : 'Agregar al armado'} ${item.displayName}`}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-container px-3 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name={replaces ? 'swap_horiz' : 'add_circle'} className="text-[18px]" />
              {adding
                ? 'Buscando oferta…'
                : !hasOffers
                  ? 'Sin ofertas hoy'
                  : replaces
                    ? 'Reemplazar en el armado'
                    : 'Agregar al armado'}
            </button>
          )}
          <Link
            to={`/producto/${item.componentId}`}
            aria-label={`Ver ${item.displayName}`}
            title="Ver el producto"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
          >
            <Icon name="open_in_new" className="text-[18px]" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Marcador de carga con las proporciones de una tarjeta. */
export function FavoriteCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-space-md rounded-2xl bg-surface-container p-space-md motion-safe:animate-pulse"
    >
      <div className="h-4 w-20 rounded bg-surface-variant" />
      <div className="h-32 rounded-xl bg-surface-container-low" />
      <div className="h-6 w-3/4 rounded bg-surface-variant" />
      <div className="h-4 w-1/2 rounded bg-surface-variant" />
      <div className="h-8 w-1/2 rounded bg-surface-variant" />
      <div className="h-11 rounded-xl bg-surface-variant" />
    </div>
  );
}
