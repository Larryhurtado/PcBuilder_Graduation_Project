import { useMemo } from 'react';
import { formatCOP } from '../../shared/lib/format.js';
import Icon from '../../shared/ui/Icon.jsx';
import { useComponentOffers } from '../product/queries.js';
import { parsePrice } from './PriceCell.jsx';
import {
  badBorder,
  Field,
  inputClass,
  invalid,
  okBorder,
  PrimaryButton,
  StepActions,
} from './PublishFields.jsx';
import { deltaVsAverage, priceReference } from './publish.js';

const CONDITIONS = [
  ['new', 'Nuevo (sellado de fábrica)', 'Caja original con sellos de garantía intactos.'],
  ['used', 'Usado (garantizado)', 'Reacondicionado o probado en tienda.'],
];

/** Referencia con las ofertas vigentes del mismo componente (mínimo, promedio y máximo). */
export function PriceReference({ componentId, price }) {
  const offers = useComponentOffers(componentId);
  const reference = useMemo(() => priceReference(offers.data?.items ?? []), [offers.data]);
  const typed = parsePrice(price);

  return (
    <aside
      aria-label="Referencia de mercado"
      className="space-y-space-sm rounded-2xl border border-outline-variant bg-surface-container-low p-space-md"
    >
      <h3 className="text-label-md text-on-surface">Referencia de mercado en Colombia</h3>
      {offers.isPending ? (
        <p role="status" className="text-body-sm text-outline">
          Buscando ofertas de este producto…
        </p>
      ) : !reference ? (
        <p className="text-body-sm text-on-surface-variant">
          Aún no hay referencia: este producto tiene menos de 2 ofertas publicadas.
        </p>
      ) : (
        <>
          <p className="tnum text-price-display text-on-surface">
            {formatCOP(reference.average)}
            <span className="ml-2 text-label-sm font-medium text-outline">promedio</span>
          </p>
          {typed !== null && (
            <p className="text-body-sm text-on-surface-variant">
              {(() => {
                const delta = deltaVsAverage(typed, reference.average);
                if (delta === 0) return 'Tu precio es igual al promedio.';
                const sign = delta > 0 ? '+' : '−';
                return `Tu precio está ${sign}${Math.abs(delta).toLocaleString('es-CO')} % ${
                  delta > 0 ? 'por encima' : 'por debajo'
                } del promedio.`;
              })()}
            </p>
          )}
          <p className="tnum text-label-sm text-outline">
            Mín: {formatCOP(reference.min)} · Máx: {formatCOP(reference.max)} · {reference.count}{' '}
            ofertas
          </p>
        </>
      )}
    </aside>
  );
}

/** Paso 2: precio, condición, garantía y notas (stock y SKU llegarán con la API). */
export default function StepConditions({
  draft,
  errors,
  onChange,
  onNext,
  onBack,
  componentName,
  conditionLocked = false,
}) {
  const style = (error) => `${inputClass} ${error ? badBorder : okBorder}`;
  const formatPrice = (text) => {
    const digits = text.replace(/\D/g, '');
    return digits ? Number(digits).toLocaleString('es-CO') : '';
  };

  return (
    <section aria-labelledby="paso-condiciones" className="space-y-space-lg">
      <header className="space-y-1">
        <p className="text-label-sm uppercase tracking-wider text-primary">Paso 02 de 04</p>
        <h2 id="paso-condiciones" className="text-headline-md text-on-surface">
          Condiciones comerciales
        </h2>
        <p className="text-body-sm text-on-surface-variant">{componentName}</p>
      </header>

      <div className="grid gap-space-md md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Field
          id="pub-precio"
          label="Precio de venta al público (COP)"
          badge="IVA incluido"
          error={errors.price}
          hint="Escribe el valor exacto, sin decimales."
        >
          <input
            id="pub-precio"
            inputMode="numeric"
            autoComplete="off"
            value={draft.price}
            onChange={(event) => onChange({ price: formatPrice(event.target.value) })}
            className={`tnum ${style(errors.price)}`}
            {...invalid('pub-precio', errors.price)}
          />
        </Field>
        <PriceReference componentId={draft.componentId} price={draft.price} />
      </div>

      <fieldset className="space-y-space-sm">
        <legend className="text-label-md text-on-surface">Condición del componente</legend>
        <div className="grid gap-space-sm sm:grid-cols-2">
          {CONDITIONS.map(([value, title, text]) => {
            const selected = draft.condition === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-space-sm rounded-2xl border-2 p-space-md transition-colors focus-within:ring-3 focus-within:ring-primary-container/25 ${
                  selected
                    ? 'border-primary bg-surface-container-high'
                    : 'border-outline-variant bg-surface hover:border-outline'
                }`}
              >
                <input
                  type="radio"
                  name="condicion"
                  value={value}
                  checked={selected}
                  disabled={conditionLocked}
                  onChange={() => onChange({ condition: value })}
                  className="mt-1 h-4 w-4 accent-primary-container"
                />
                <span className="space-y-0.5">
                  <span className="block text-label-md text-on-surface">{title}</span>
                  <span className="block text-body-sm text-on-surface-variant">{text}</span>
                </span>
              </label>
            );
          })}
        </div>
        {conditionLocked && (
          <p className="text-body-sm text-outline">
            La condición no se puede cambiar: para ofrecerlo en otro estado, publica otra oferta.
          </p>
        )}
      </fieldset>

      <div className="grid gap-space-md sm:grid-cols-3">
        <Field
          id="pub-garantia"
          label="Garantía (meses)"
          error={errors.warranty}
          hint="De 0 a 120 meses."
        >
          <input
            id="pub-garantia"
            inputMode="numeric"
            value={draft.warranty}
            onChange={(event) => onChange({ warranty: event.target.value })}
            className={`tnum ${style(errors.warranty)}`}
            {...invalid('pub-garantia', errors.warranty)}
          />
        </Field>
        <Field id="pub-stock" label="Stock en sede" badge="Próximamente" hint="Aún no disponible.">
          <input id="pub-stock" disabled placeholder="—" className={`${inputClass} ${okBorder}`} />
        </Field>
        <Field id="pub-sku" label="SKU interno" badge="Próximamente" hint="Aún no disponible.">
          <input id="pub-sku" disabled placeholder="—" className={`${inputClass} ${okBorder}`} />
        </Field>
      </div>

      <Field
        id="pub-notas"
        label="Notas comerciales y logística"
        badge="Opcional · visible en la ficha"
        error={errors.notes}
        hint={`${draft.notes.length} de 1000 caracteres`}
      >
        <textarea
          id="pub-notas"
          rows={4}
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          className={`w-full rounded-xl border bg-surface p-3 text-body-md text-on-surface focus:outline-none focus:ring-3 ${errors.notes ? badBorder : okBorder}`}
          {...invalid('pub-notas', errors.notes)}
        />
      </Field>

      <StepActions onBack={onBack}>
        <PrimaryButton onClick={onNext}>Continuar a galería de fotos</PrimaryButton>
      </StepActions>
      <p className="flex items-start gap-1 text-body-sm text-outline">
        <Icon name="info" className="mt-0.5 text-[16px]" />
        El stock y el SKU se podrán registrar cuando el servicio los soporte.
      </p>
    </section>
  );
}
