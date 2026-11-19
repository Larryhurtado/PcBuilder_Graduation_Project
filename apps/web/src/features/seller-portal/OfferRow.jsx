import { Link } from 'react-router';
import { formatWarranty } from '../../shared/lib/format.js';
import { categoryLabels } from '../../shared/lib/specs.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import ConditionChip from '../../shared/ui/ConditionChip.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import PriceCell from './PriceCell.jsx';

/** Columnas de la tabla en pantallas grandes; en el celular cada oferta es una tarjeta. */
export const COLUMNS = 'lg:grid-cols-[minmax(0,3fr)_5.5rem_14rem_7rem_9.5rem_6rem]';

function Label({ children }) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-outline lg:hidden">
      {children}
    </span>
  );
}

/**
 * Una oferta del inventario: componente, condición, precio con edición rápida, garantía, interruptor
 * de visibilidad y acciones. `canEdit` es falso mientras el negocio no esté verificado: la API no
 * deja editar ni pausar, pero sí eliminar.
 * @param {{ offer: any, canEdit: boolean, togglePending: boolean, onToggle: () => void, onSavePrice: (price: number) => Promise<unknown>, onDelete: () => void }} props
 */
export default function OfferRow({
  offer,
  canEdit,
  togglePending,
  onToggle,
  onSavePrice,
  onDelete,
}) {
  const { component } = offer;
  const name = component.displayName;
  const active = offer.status === 'active';

  return (
    <li
      className={`grid gap-space-sm rounded-2xl bg-surface-container p-space-md lg:items-center lg:gap-space-md lg:rounded-none lg:bg-transparent lg:px-space-lg lg:py-space-sm ${COLUMNS}`}
    >
      <div className="flex min-w-0 items-center gap-space-sm">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface ${
            active ? 'text-primary' : 'text-outline'
          }`}
        >
          <CategoryIcon category={component.category} className="h-6 w-6" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-label-md leading-snug text-on-surface">{name}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-variant">
            <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-medium">
              {component.brand}
            </span>
            {categoryLabels[component.category] ?? component.category}
          </p>
        </div>
      </div>

      <div>
        <Label>Condición</Label>
        <ConditionChip condition={offer.condition} />
      </div>

      <div>
        <Label>Precio (COP)</Label>
        <PriceCell offer={offer} canEdit={canEdit} onSave={onSavePrice} />
      </div>

      <div>
        <Label>Garantía</Label>
        <span className="tnum text-body-sm text-on-surface-variant">
          {formatWarranty(offer.warrantyMonths)}
        </span>
      </div>

      <div>
        <Label>Estado y visibilidad</Label>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={`Visibilidad de ${name}`}
          onClick={onToggle}
          disabled={!canEdit || togglePending}
          title={canEdit ? undefined : 'Disponible cuando tu negocio esté verificado'}
          className="flex min-h-11 items-center gap-2 rounded-lg pr-2 text-label-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none ${
              active ? 'bg-compatible' : 'bg-surface-variant'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-surface transition-transform motion-reduce:transition-none ${
                active ? 'translate-x-5' : ''
              }`}
            />
          </span>
          <span
            className={`flex items-center gap-1 ${active ? 'text-compatible' : 'text-on-surface-variant'}`}
          >
            <Icon name={active ? 'check_circle' : 'pause_circle'} className="text-[16px]" />
            {active ? 'Visible' : 'Pausado'}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1 lg:justify-end">
        {canEdit ? (
          <Link
            to={`/vendedor/publicar?editar=${offer.offerId}`}
            aria-label={`Editar ${name}`}
            title="Editar la oferta"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface hover:text-on-surface"
          >
            <Icon name="edit_note" className="text-[22px]" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-label={`Editar ${name}`}
            title="Disponible cuando tu negocio esté verificado"
            className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-lg text-outline opacity-50"
          >
            <Icon name="edit_note" className="text-[22px]" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${name}`}
          title="Eliminar la oferta"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-outline transition-colors hover:bg-incompatible/10 hover:text-incompatible"
        >
          <Icon name="delete" className="text-[22px]" />
        </button>
      </div>
    </li>
  );
}
