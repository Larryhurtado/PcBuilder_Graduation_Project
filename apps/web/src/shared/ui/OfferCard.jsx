import { Link } from 'react-router';
import { formatCOP } from '../lib/format.js';
import { specHighlight, specLine } from '../lib/specs.js';
import ConditionChip from './ConditionChip.jsx';
import Icon from './Icon.jsx';
import OfferImage from './OfferImage.jsx';
import WhatsAppLink from './WhatsAppLink.jsx';

/**
 * Tarjeta de oferta (inicio, catálogo, ficha y perfil de tienda). Toda la tarjeta lleva a la ficha
 * del componente; el botón de WhatsApp queda por encima y abre el chat sin salir de la tarjeta.
 * @param {{ offer: import('zod').infer<typeof import('@hw/contracts').offerListItemSchema> }} props
 */
export default function OfferCard({ offer }) {
  const { component, store } = offer;
  const line = specLine(component.category, component.specs);
  const highlight = specHighlight(component.category, component.specs);
  const place = store.commercialCenter ? `${store.city} (${store.commercialCenter})` : store.city;

  return (
    <article className="relative flex flex-col justify-between rounded-2xl bg-surface-container p-5">
      <div className="mb-space-md flex items-center justify-between">
        <ConditionChip condition={offer.condition} />
      </div>

      <div className="flex flex-1 flex-col">
        <OfferImage offer={offer} className="mb-space-md h-36" />
        <h3 className="text-headline-sm leading-snug text-on-surface">
          <Link
            to={`/producto/${component.id}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
          >
            {component.displayName}
          </Link>
        </h3>
        {line && <p className="tnum mt-1 text-code-metric text-on-surface-variant">{line}</p>}

        <p className="mt-space-sm flex items-center gap-1.5 text-body-sm text-outline">
          <Icon name="storefront" className="text-[16px] text-tertiary" />
          <span className="truncate">
            {store.name} • {place}
          </span>
        </p>

        {highlight && (
          <p className="tnum mt-space-md inline-flex items-center gap-1.5 self-start rounded-lg bg-surface-container-high px-3 py-1.5 text-code-metric text-on-surface-variant">
            <Icon name="tune" className="text-[16px]" />
            <span>{highlight}</span>
          </p>
        )}

        <p className="tnum mt-space-md text-headline-md font-bold text-on-surface">
          {formatCOP(offer.priceCop)}
        </p>
      </div>

      <WhatsAppLink offer={offer} className="relative z-10 mt-space-lg" />
    </article>
  );
}

/** Marcador de carga con las mismas proporciones que la tarjeta. */
export function OfferCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex animate-pulse flex-col gap-space-md rounded-2xl bg-surface-container p-5 motion-reduce:animate-none"
    >
      <div className="h-5 w-16 rounded-full bg-surface-variant" />
      <div className="h-36 rounded-xl bg-surface-container-low" />
      <div className="h-6 w-3/4 rounded bg-surface-variant" />
      <div className="h-4 w-full rounded bg-surface-variant" />
      <div className="h-4 w-2/3 rounded bg-surface-variant" />
      <div className="h-7 w-1/2 rounded bg-surface-variant" />
      <div className="mt-space-sm h-11 rounded-xl bg-surface-variant" />
    </div>
  );
}
