import { Link } from 'react-router';
import { formatCOP, formatWarranty } from '../../shared/lib/format.js';
import { specLine } from '../../shared/lib/specs.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import ConditionChip from '../../shared/ui/ConditionChip.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import WhatsAppLink from '../../shared/ui/WhatsAppLink.jsx';
import { AddToBuildButton, FavoriteButton } from './OfferActions.jsx';

/**
 * Oferta del catálogo en vista compacta: una fila con lo esencial para comparar precios.
 * @param {{ offer: import('zod').infer<typeof import('@hw/contracts').offerListItemSchema>, inBuild: boolean, replaces: boolean, onAdd: (offer: any) => void }} props
 */
export default function CatalogRow({ offer, inBuild, replaces, onAdd }) {
  const { component, store } = offer;
  const line = specLine(component.category, component.specs);

  return (
    <article className="relative flex flex-col gap-space-md rounded-2xl bg-surface-container p-space-md sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-space-md">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-outline-variant">
          {offer.coverImageUrl ? (
            <img
              src={offer.coverImageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <CategoryIcon category={component.category} className="h-7 w-7" />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="line-clamp-2 text-label-md font-semibold text-on-surface">
            <Link
              to={`/producto/${component.id}`}
              title={component.displayName}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
            >
              {component.displayName}
            </Link>
          </h3>
          {line && <p className="tnum truncate text-body-sm text-on-surface-variant">{line}</p>}
          <p className="flex flex-wrap items-center gap-x-space-sm gap-y-1 text-body-sm text-outline">
            <span className="flex items-center gap-1">
              <Icon name="storefront" className="text-[16px] text-tertiary" />
              {store.name} · {store.city}
            </span>
            <ConditionChip condition={offer.condition} />
            <span>{formatWarranty(offer.warrantyMonths)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-space-md sm:justify-end">
        <span className="tnum text-price-display text-on-surface sm:min-w-32 sm:text-right">
          {formatCOP(offer.priceCop)}
        </span>
        <div className="relative z-10 flex items-center gap-space-xs">
          <AddToBuildButton offer={offer} inBuild={inBuild} replaces={replaces} onAdd={onAdd} />
          <WhatsAppLink offer={offer} variant="inline" />
          <FavoriteButton name={component.displayName} className="hidden sm:flex" />
        </div>
      </div>
    </article>
  );
}
