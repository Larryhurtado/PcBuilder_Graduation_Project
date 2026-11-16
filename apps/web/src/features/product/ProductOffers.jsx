import { useMemo, useState } from 'react';
import { formatCOP, formatLocation, formatWarranty } from '../../shared/lib/format.js';
import ConditionChip from '../../shared/ui/ConditionChip.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import WhatsAppLink from '../../shared/ui/WhatsAppLink.jsx';
import { AddToBuildButton } from '../catalog/OfferActions.jsx';

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

const place = ({ commercialCenter, city, department }) =>
  [commercialCenter, formatLocation({ city, department })].filter(Boolean).join(' • ');

function OfferRow({ offer, best, inBuild, replaces, onAdd }) {
  const { store } = offer;
  return (
    <li className="list-none rounded-2xl bg-surface-container p-space-md">
      <div className="flex flex-col gap-space-md md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-space-md">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-label-md text-primary"
          >
            {initials(store.name)}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
              <h3 className="text-headline-sm text-on-surface">{store.name}</h3>
              <span className="inline-flex items-center gap-1 rounded bg-compatible/12 px-2 py-0.5 text-[11px] font-medium text-compatible">
                <Icon name="verified" className="text-[13px]" />
                Comercio verificado
              </span>
              {best && (
                <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-bold text-on-secondary">
                  Mejor precio
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-body-sm text-outline">
              <Icon name="location_on" className="text-[16px]" />
              <span>{place(store)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-space-xs pt-1">
              <ConditionChip condition={offer.condition} />
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-label-sm text-on-surface-variant">
                {formatWarranty(offer.warrantyMonths)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-space-sm md:items-end">
          <p className="tnum text-headline-md font-bold text-on-surface">
            {formatCOP(offer.priceCop)}
          </p>
          <div className="flex gap-space-xs">
            <AddToBuildButton offer={offer} inBuild={inBuild} replaces={replaces} onAdd={onAdd} />
            <WhatsAppLink offer={offer} variant="inline" />
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Ofertas del componente por tienda, con filtro por ciudad y orden por precio.
 * @param {{ offers: any[], parts: Record<string, any>, onAdd: (offer: any) => void }} props
 */
export default function ProductOffers({ offers, parts, onAdd }) {
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('price_asc');

  const cities = useMemo(
    () => [...new Set(offers.map((offer) => offer.store.city).filter(Boolean))].sort(),
    [offers],
  );
  const bestPrice = useMemo(() => Math.min(...offers.map((offer) => offer.priceCop)), [offers]);

  // Si la ciudad elegida ya no tiene ofertas, se muestran todas
  const activeCity = cities.includes(city) ? city : '';
  const visible = useMemo(
    () =>
      offers
        .filter((offer) => !activeCity || offer.store.city === activeCity)
        .sort((a, b) => (sort === 'price_asc' ? a.priceCop - b.priceCop : b.priceCop - a.priceCop)),
    [offers, activeCity, sort],
  );

  const chip = (value, label) => (
    <button
      key={value}
      type="button"
      aria-pressed={activeCity === value}
      onClick={() => setCity(value)}
      className="min-h-11 rounded-full bg-surface-container px-4 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-space-md">
      <div className="flex flex-col gap-space-sm md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Filtrar por ciudad" className="flex flex-wrap gap-space-xs">
          {chip('', 'Todas las ciudades')}
          {cities.map((name) => chip(name, name))}
        </div>
        <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <span>Ordenar por</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Ordenar ofertas"
            className="h-11 rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25"
          >
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
          </select>
        </label>
      </div>

      <ul className="space-y-space-sm">
        {visible.map((offer) => {
          const current = parts[offer.component.category];
          const inBuild = current?.offerId === offer.offerId;
          return (
            <OfferRow
              key={offer.offerId}
              offer={offer}
              best={offers.length > 1 && offer.priceCop === bestPrice}
              inBuild={inBuild}
              replaces={Boolean(current) && !inBuild}
              onAdd={onAdd}
            />
          );
        })}
      </ul>
    </div>
  );
}
