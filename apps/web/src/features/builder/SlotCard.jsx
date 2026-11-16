import { formatCOP } from '../../shared/lib/format.js';
import { specLine } from '../../shared/lib/specs.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import StatusPill from '../../shared/ui/StatusPill.jsx';
import { lowerFirst } from './analysis.js';

const conflictBg =
  'bg-[color-mix(in_srgb,var(--color-incompatible)_3%,var(--color-surface-container))]';

/** Texto del estado de la ranura: el peor de las reglas que involucran a la pieza. */
function SlotStatus({ slotAnalysis }) {
  if (!slotAnalysis || slotAnalysis.status === 'none') return null;
  const { status, results } = slotAnalysis;
  const of = (wanted) => results.filter((result) => result.status === wanted);

  if (status === 'fail') {
    const fails = of('fail');
    return (
      <StatusPill status="fail">
        Incompatible: {fails[0].message}
        {fails.length > 1 && ` (+${fails.length - 1} más)`}
      </StatusPill>
    );
  }
  if (status === 'unknown') {
    return (
      <StatusPill status="unknown">
        No verificable: {lowerFirst(of('unknown')[0].message)}; confírmalo con la tienda
      </StatusPill>
    );
  }
  return (
    <StatusPill status="ok">
      Compatible ·{' '}
      {of('ok')
        .map((result) => result.code)
        .join(', ')}
    </StatusPill>
  );
}

/**
 * Ranura del armado, con pieza o vacía.
 * @param {{ slot: typeof import('./slots.js').SLOTS[number], offer?: any, slotAnalysis?: any, hint?: string, onPick: (category: string) => void, onRemove: (category: string) => void }} props
 */
export default function SlotCard({ slot, offer, slotAnalysis, hint, onPick, onRemove }) {
  const { category } = slot;

  if (!offer) {
    return (
      <article
        aria-label={`${slot.title}: ranura vacía`}
        className="group flex flex-col justify-between rounded-2xl bg-surface-container p-space-md transition-colors hover:bg-surface-container-high motion-reduce:transition-none"
      >
        <div className="space-y-space-xs">
          <div className="flex items-center justify-between gap-space-sm">
            <span className="text-label-sm uppercase tracking-wider text-outline">
              {slot.number} · {slot.title}
            </span>
            <span className="rounded bg-surface-variant px-2 py-0.5 text-[11px] text-outline">
              Ranura vacía
            </span>
          </div>
          <div className="flex items-center gap-space-md py-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface text-outline">
              <CategoryIcon
                category={category}
                className="h-7 w-7 transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
              />
            </div>
            <div>
              <h3 className="text-headline-sm text-on-surface-variant transition-colors group-hover:text-on-surface">
                Sin {slot.pick} seleccionado
              </h3>
              <p className="text-body-sm text-outline">{hint ?? slot.hint}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onPick(category)}
          className="mt-space-sm flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface text-label-md text-on-surface transition-all hover:bg-primary-container hover:text-on-primary-container motion-reduce:transition-none"
        >
          <Icon name="add" className="text-[18px]" />
          <span>Elegir componente{category === 'cooler' ? ' (Líquida o Aire)' : ''}</span>
        </button>
      </article>
    );
  }

  const { component, store } = offer;
  const conflict = slotAnalysis?.status === 'fail';
  const line = specLine(category, component.specs);

  return (
    <article
      aria-label={`${slot.title}: ${component.displayName}`}
      className={`group flex flex-col justify-between rounded-2xl p-space-md transition-colors hover:bg-surface-container-high motion-reduce:transition-none ${
        conflict ? conflictBg : 'bg-surface-container'
      }`}
    >
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between gap-space-sm">
          <span
            className={`text-label-sm uppercase tracking-wider ${
              conflict ? 'font-semibold text-incompatible' : 'text-outline'
            }`}
          >
            {slot.number} · {slot.title}
          </span>
          <span className="truncate rounded bg-surface px-2 py-0.5 text-[11px] text-on-surface-variant">
            {store.name} · {store.city}
          </span>
        </div>
        <div className="flex gap-space-sm">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface p-2 ${
              conflict ? 'text-incompatible' : 'text-outline'
            }`}
          >
            <CategoryIcon category={category} className="h-8 w-8" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3
              className="line-clamp-2 text-headline-sm text-on-surface"
              title={component.displayName}
            >
              {component.displayName}
            </h3>
            {line && <p className="tnum text-body-sm text-on-surface-variant">{line}</p>}
            <SlotStatus slotAnalysis={slotAnalysis} />
          </div>
        </div>
      </div>

      <div className="mt-space-md flex items-center justify-between pt-space-md">
        <div>
          <span className="block text-[10px] font-semibold uppercase text-outline">Precio COP</span>
          <span className="tnum text-price-display text-on-surface">
            {formatCOP(offer.priceCop)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPick(category)}
            className={`min-h-11 rounded-lg bg-surface px-3 text-label-sm transition-colors hover:bg-surface-variant ${
              conflict ? 'text-incompatible' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {conflict ? 'Reemplazar' : 'Cambiar'}
          </button>
          <button
            type="button"
            onClick={() => onRemove(category)}
            aria-label={`Quitar ${component.displayName}`}
            title="Quitar pieza"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface hover:text-error"
          >
            <Icon name="delete" className="text-[18px]" />
          </button>
        </div>
      </div>
    </article>
  );
}
