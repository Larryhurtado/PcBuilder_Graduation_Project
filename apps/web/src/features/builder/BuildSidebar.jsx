import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import { formatCOPAmount } from '../../shared/lib/format.js';
import Icon from '../../shared/ui/Icon.jsx';
import WhatsAppLink from '../../shared/ui/WhatsAppLink.jsx';
import { SLOTS } from './slots.js';

const statusView = {
  ok: { icon: 'check_circle', color: 'text-compatible', label: 'Compatible' },
  fail: { icon: 'cancel', color: 'text-incompatible', label: 'Incompatible' },
  unknown: { icon: 'help', color: 'text-unverifiable', label: 'No verificable' },
  none: { icon: 'radio_button_unchecked', color: 'text-outline', label: 'Sin reglas aplicables' },
};

/**
 * "Tu armado": resumen lateral con el estado de cada pieza, WhatsApp por pieza, total y acciones.
 * @param {{ analysis: ReturnType<typeof import('./analysis.js').analyzeBuild>, parts: Record<string, any>, onPick: (category: string) => void, onSave: () => void, onShare: () => void, sharing?: boolean }} props
 */
export default function BuildSidebar({
  analysis,
  parts,
  onPick,
  onSave,
  onShare,
  sharing = false,
}) {
  const { count, total, failures, bySlot } = analysis;
  const conflicts = failures.length;

  return (
    <div id="tu-armado" className="scroll-mt-24 space-y-space-md">
      <section
        aria-labelledby="tu-armado-title"
        className="space-y-space-md rounded-2xl bg-surface-container p-space-md"
      >
        <div className="flex items-center justify-between gap-space-sm pb-space-sm">
          <div>
            <h2 id="tu-armado-title" className="text-headline-sm text-on-surface">
              Tu armado
            </h2>
            <span className="tnum text-code-metric text-on-surface-variant">
              Configuración: {count}/{SLOTS.length} piezas
            </span>
          </div>
          {conflicts > 0 && (
            <span className="rounded bg-incompatible/15 px-2.5 py-1 text-[11px] font-bold text-incompatible">
              {conflicts} {conflicts === 1 ? 'Conflicto' : 'Conflictos'}
            </span>
          )}
        </div>

        <ul className="max-h-[380px] space-y-space-xs overflow-y-auto pr-1">
          {SLOTS.map((slot) => {
            const offer = parts[slot.category];
            if (!offer) {
              return (
                <li
                  key={slot.category}
                  className="flex items-center justify-between gap-2 rounded-xl bg-surface/50 p-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon name={statusView.none.icon} className="text-[14px] text-outline" />
                    <div>
                      <span className="block text-[11px] font-semibold leading-none text-outline">
                        {slot.short}
                      </span>
                      <span className="text-body-sm italic text-outline">
                        Pendiente de selección
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPick(slot.category)}
                    aria-label={`Añadir ${slot.pick}`}
                    className="min-h-11 shrink-0 rounded bg-surface px-2 text-[11px] font-semibold text-primary transition-colors hover:bg-surface-variant"
                  >
                    + Añadir
                  </button>
                </li>
              );
            }

            const status = bySlot[slot.category]?.status ?? 'none';
            const view = statusView[status];
            const conflict = status === 'fail';
            return (
              <li
                key={slot.category}
                className={`flex items-center justify-between gap-2 rounded-xl p-2 transition-colors ${
                  conflict
                    ? 'bg-incompatible/10 hover:bg-incompatible/15'
                    : 'bg-surface hover:bg-surface-variant'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon name={view.icon} className={`text-[14px] ${view.color}`} />
                  <span className="sr-only">{view.label}:</span>
                  <div className="min-w-0">
                    <span
                      className={`block text-[11px] font-semibold leading-none ${
                        conflict ? 'text-incompatible' : 'text-outline'
                      }`}
                    >
                      {slot.short}
                      {conflict && ' (Conflicto)'}
                    </span>
                    <span
                      className="block truncate text-body-sm font-medium text-on-surface"
                      title={offer.component.displayName}
                    >
                      {offer.component.displayName}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tnum text-code-metric font-semibold text-on-surface">
                    $ {formatCOPAmount(offer.priceCop)}
                  </span>
                  <WhatsAppLink offer={offer} variant="icon" />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="space-y-space-xs pt-space-md">
          <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>Subtotal componentes ({count})</span>
            <span className="tnum text-code-metric">$ {formatCOPAmount(total)} COP</span>
          </div>
          <div className="flex items-baseline justify-between pt-2">
            <div>
              <span className="block text-[11px] font-semibold uppercase text-outline">
                Total estimado ensamblaje
              </span>
              <span className="text-[10px] text-outline">Moneda local (COP)</span>
            </div>
            <span className="tnum text-[1.5rem] font-bold tracking-tight text-on-surface">
              $ {formatCOPAmount(total)}{' '}
              <span className="text-[12px] font-normal text-outline">COP</span>
            </span>
          </div>
          <p className="pt-1 text-[11px] leading-tight text-outline">
            Precios publicados por cada tienda; confirma la disponibilidad por WhatsApp. No cobramos
            comisiones ni realizamos cobros en la web.
          </p>
        </div>

        <div className="space-y-space-xs pt-space-xs">
          <ComingSoonButton
            icon="download"
            label="Descargar cotización (PDF / Imprimir)"
            className="h-14 w-full bg-primary-container font-semibold text-on-primary-container"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onShare}
              disabled={count === 0 || sharing}
              title={count === 0 ? 'Agrega al menos una pieza para compartir' : undefined}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-surface text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-surface"
            >
              <Icon name="link" className="text-[18px]" />
              {sharing ? 'Creando enlace…' : 'Copiar enlace'}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={count === 0}
              title={count === 0 ? 'Agrega al menos una pieza para guardar' : undefined}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-surface text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-surface"
            >
              <Icon name="bookmark" className="text-[18px]" />
              Guardar
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-space-xs rounded-2xl bg-surface-container p-space-md">
        <div className="flex items-center gap-2 text-secondary">
          <Icon name="help_center" className="text-[20px]" />
          <h2 className="text-label-md font-semibold">¿Dudas de compatibilidad?</h2>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          El motor revisa 8 reglas (RC-01 a RC-08) con las especificaciones de la base maestra.
          Cuando falta un dato lo marca como No verificable en vez de darlo por bueno: confírmalo
          con la tienda por WhatsApp.
        </p>
      </aside>
    </div>
  );
}
