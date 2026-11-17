import { Link } from 'react-router';
import { formatCOP, formatWarranty } from '../../shared/lib/format.js';
import { specHighlight, specLine, specPills } from '../../shared/lib/specs.js';
import ConditionChip from '../../shared/ui/ConditionChip.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import OfferImage from '../../shared/ui/OfferImage.jsx';
import WhatsAppLink from '../../shared/ui/WhatsAppLink.jsx';
import FavoriteButton from '../favorites/FavoriteButton.jsx';
import { AddToBuildButton } from './OfferActions.jsx';

const place = ({ city, commercialCenter }) => [city, commercialCenter].filter(Boolean).join(' • ');

/**
 * Tarjeta de oferta del catálogo. Toda la tarjeta lleva a la ficha del componente; los botones
 * quedan por encima del enlace.
 * @param {{ offer: import('zod').infer<typeof import('@hw/contracts').offerListItemSchema>, inBuild: boolean, replaces: boolean, onAdd: (offer: any) => void }} props
 */
export default function CatalogCard({ offer, inBuild, replaces, onAdd }) {
  const { component, store } = offer;
  const line = specLine(component.category, component.specs);
  const highlight = specHighlight(component.category, component.specs);
  const pills = specPills(component.category, component.specs);

  return (
    <article className="relative flex h-full flex-col justify-between gap-space-md rounded-2xl bg-surface-container p-space-md">
      <div className="space-y-space-md">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-space-xs">
            <ConditionChip condition={offer.condition} />
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-label-sm text-on-surface-variant">
              {formatWarranty(offer.warrantyMonths)}
            </span>
          </div>
          <FavoriteButton component={component} className="relative z-10 -my-2 -mr-2" />
        </div>

        <OfferImage offer={offer} className="h-40" iconClassName="h-16 w-16">
          {highlight && (
            <span className="tnum absolute bottom-2 left-2 rounded bg-surface px-2 py-0.5 text-[11px] font-medium text-on-surface">
              {highlight}
            </span>
          )}
        </OfferImage>

        <div className="space-y-1">
          <h3 className="line-clamp-2 text-headline-sm leading-snug text-on-surface">
            <Link
              to={`/producto/${component.id}`}
              title={component.displayName}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
            >
              {component.displayName}
            </Link>
          </h3>
          {line && <p className="tnum line-clamp-2 text-body-sm text-on-surface-variant">{line}</p>}
        </div>

        {pills.length > 0 && (
          <ul className="flex flex-wrap gap-space-xs" aria-label="Datos técnicos">
            {pills.map((pill) => (
              <li
                key={pill}
                className="tnum list-none rounded bg-surface px-2 py-0.5 text-[11px] font-medium text-on-surface-variant"
              >
                {pill}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-1 text-body-sm">
          <p className="flex items-center gap-1.5 text-on-surface">
            <Icon name="storefront" className="text-[16px] text-tertiary" />
            <span className="truncate font-medium">{store.name}</span>
          </p>
          <p className="flex items-center gap-1.5 text-outline">
            <Icon name="location_on" className="text-[16px]" />
            <span className="truncate">{place(store)}</span>
          </p>
        </div>
      </div>

      <div className="space-y-space-sm">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-outline">
            Precio
          </span>
          <span className="tnum text-headline-md font-bold text-on-surface">
            {formatCOP(offer.priceCop)}
          </span>
        </div>
        <div className="relative z-10 flex gap-space-xs">
          <AddToBuildButton
            offer={offer}
            inBuild={inBuild}
            replaces={replaces}
            onAdd={onAdd}
            className="flex-1"
          />
          <WhatsAppLink offer={offer} variant="inline" className="flex-1" />
        </div>
      </div>
    </article>
  );
}

/** Marcador de carga con las mismas proporciones que la tarjeta. */
export function CatalogCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse flex-col gap-space-md rounded-2xl bg-surface-container p-space-md motion-reduce:animate-none"
    >
      <div className="h-5 w-32 rounded-full bg-surface-variant" />
      <div className="h-40 rounded-xl bg-surface-container-low" />
      <div className="h-6 w-3/4 rounded bg-surface-variant" />
      <div className="h-4 w-full rounded bg-surface-variant" />
      <div className="h-5 w-1/2 rounded bg-surface-variant" />
      <div className="h-8 w-1/2 rounded bg-surface-variant" />
      <div className="h-11 rounded-xl bg-surface-variant" />
    </div>
  );
}
