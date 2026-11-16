import { useMemo } from 'react';
import { PLATFORM_NAME } from '../../shared/config.js';
import { formatCOP } from '../../shared/lib/format.js';
import { specLine } from '../../shared/lib/specs.js';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import Dialog from '../../shared/ui/Dialog.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { SLOTS } from './slots.js';

const TITLE_ID = 'cotizacion-titulo';

const dateFormat = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

function Sheet({ parts, analysis }) {
  const generatedAt = useMemo(() => dateFormat.format(new Date()), []);
  const { failures, total } = analysis;

  return (
    <div className="space-y-6 rounded-2xl bg-white p-5 font-sans text-[#1F1D23] sm:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xl font-bold tracking-tight text-gray-900">{PLATFORM_NAME} Colombia</p>
          <p className="mt-1 text-xs text-gray-600">
            Reporte técnico de especificaciones y cotización multitienda
          </p>
        </div>
        <div className="space-y-0.5 text-xs text-gray-700 sm:text-right">
          <p>
            Fecha: <strong className="text-gray-900">{generatedAt}</strong>
          </p>
          <p>
            Validez:{' '}
            <strong className="text-gray-900">Sujeto a stock y precio de cada tienda</strong>
          </p>
        </div>
      </div>

      {failures.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800">
          <Icon name="warning" className="text-[18px] text-red-600" />
          <div>
            <strong>ADVERTENCIA TÉCNICA:</strong>
            <ul className="mt-1 list-disc pl-4">
              {failures.map((failure) => (
                <li key={failure.code}>
                  {failure.code}: {failure.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <table className="w-full border-collapse text-left text-xs">
        <caption className="sr-only">Piezas del armado con su comercio y precio</caption>
        <thead>
          <tr className="bg-gray-100 uppercase text-gray-700">
            <th scope="col" className="p-2 font-semibold">
              Ranura
            </th>
            <th scope="col" className="p-2 font-semibold">
              Componente
            </th>
            <th scope="col" className="hidden p-2 font-semibold md:table-cell">
              Especificación clave
            </th>
            <th scope="col" className="hidden p-2 font-semibold sm:table-cell">
              Comercio
            </th>
            <th scope="col" className="p-2 text-right font-semibold">
              Precio COP
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-800">
          {SLOTS.map((slot) => {
            const offer = parts[slot.category];
            const conflict = analysis.bySlot[slot.category]?.status === 'fail';
            if (!offer) {
              return (
                <tr key={slot.category} className="text-gray-500">
                  <th scope="row" className="p-2 text-left font-medium uppercase">
                    {slot.short}
                  </th>
                  <td className="p-2 italic" colSpan={3}>
                    Pendiente de selección
                  </td>
                  <td className="p-2 text-right">—</td>
                </tr>
              );
            }
            return (
              <tr key={slot.category} className={conflict ? 'bg-red-50 text-red-800' : ''}>
                <th
                  scope="row"
                  className={`p-2 text-left font-medium uppercase ${conflict ? 'text-red-700' : 'text-gray-600'}`}
                >
                  {slot.short}
                </th>
                <td className="p-2 font-semibold">
                  {offer.component.displayName}
                  <span className="mt-0.5 block text-[11px] font-normal text-gray-600 sm:hidden">
                    {offer.store.name} · {offer.store.city}
                  </span>
                </td>
                <td className="tnum hidden p-2 md:table-cell">
                  {specLine(slot.category, offer.component.specs)}
                </td>
                <td className="hidden p-2 sm:table-cell">
                  {offer.store.name} ({offer.store.city})
                </td>
                <td className="tnum p-2 text-right font-semibold">{formatCOP(offer.priceCop)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold text-gray-900">
            <td className="p-2.5 text-right text-[11px] uppercase tracking-wider" colSpan={4}>
              Total estimado de componentes:
            </td>
            <td className="tnum p-2.5 text-right text-sm">{formatCOP(total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="flex flex-col justify-between gap-2 border-t border-gray-200 pt-2 text-[11px] text-gray-600 sm:flex-row">
        <span>
          Generado con {PLATFORM_NAME} Colombia · Herramienta educativa sin fines comerciales
        </span>
        <span>Confirma la disponibilidad con cada tienda por WhatsApp antes de comprar.</span>
      </div>
    </div>
  );
}

/**
 * Vista previa de la cotización formal. Imprimir y guardar como PDF llegan después: por ahora se
 * muestran deshabilitados con "Próximamente".
 * @param {{ open: boolean, onClose: () => void, parts: Record<string, any>, analysis: ReturnType<typeof import('./analysis.js').analyzeBuild> }} props
 */
export default function QuoteModal({ open, onClose, parts, analysis }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy={TITLE_ID}>
      <div className="space-y-6 p-5 sm:p-8">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2">
            <Icon name="receipt_long" className="text-[24px] text-primary" />
            <h2 id={TITLE_ID} className="text-headline-sm text-on-surface">
              Previsualización de cotización formal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar cotización"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-outline transition-colors hover:bg-surface-variant hover:text-on-surface"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <Sheet parts={parts} analysis={analysis} />

        <div className="flex flex-col items-stretch justify-end gap-space-sm sm:flex-row sm:items-center">
          <ComingSoonButton
            icon="print"
            label="Imprimir cotización"
            className="h-14 bg-surface px-space-lg text-on-surface"
          />
          <ComingSoonButton
            icon="file_download"
            label="Guardar PDF"
            className="h-14 bg-primary-container px-space-lg text-on-primary-container"
          />
        </div>
      </div>
    </Dialog>
  );
}
