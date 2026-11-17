import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { PLATFORM_NAME } from '../../shared/config.js';
import { formatCOPAmount } from '../../shared/lib/format.js';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import Container from '../../shared/ui/Container.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import Toast from '../../shared/ui/Toast.jsx';
import { analyzeBuild } from './analysis.js';
import BuildSidebar from './BuildSidebar.jsx';
import PartPicker from './PartPicker.jsx';
import QuoteModal from './QuoteModal.jsx';
import RuleAlerts from './RuleAlerts.jsx';
import SaveBuildDialog from './SaveBuildDialog.jsx';
import SlotCard from './SlotCard.jsx';
import { SLOTS } from './slots.js';
import { useBuildStore } from './store.js';
import SummaryBar from './SummaryBar.jsx';

const mobileStatus = {
  fail: { icon: 'cancel', className: 'text-incompatible' },
  unknown: { icon: 'help', className: 'text-unverifiable' },
  ok: { icon: 'check_circle', className: 'text-compatible' },
};

/** Barra fija inferior (solo móvil): total y estado del armado, con acceso al resumen. */
function MobileBar({ analysis }) {
  const { count, total, summary } = analysis;
  if (count === 0) return null;
  const status = summary.incompatible > 0 ? 'fail' : summary.unknown > 0 ? 'unknown' : 'ok';
  const label = {
    fail: 'Con conflictos',
    unknown: 'Por confirmar',
    ok: 'Sin conflictos',
  }[status];
  const { icon, className } = mobileStatus[status];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container lg:hidden">
      <Container size="wide" className="flex items-center justify-between gap-space-md py-space-sm">
        <div className="min-w-0">
          <p className={`tnum flex items-center gap-1 text-code-metric ${className}`}>
            <Icon name={icon} className="text-[16px]" />
            <span className="truncate">
              {label} · {count}/{SLOTS.length}
            </span>
          </p>
          <p className="tnum truncate text-label-md font-semibold text-on-surface">
            $ {formatCOPAmount(total)} COP
          </p>
        </div>
        <a
          href="#tu-armado"
          className="flex h-11 shrink-0 items-center rounded-xl bg-primary-container px-5 text-label-md text-on-primary-container"
        >
          Ver armado
        </a>
      </Container>
    </div>
  );
}

/** Asistente de ensamblaje (/armador): elegir piezas, validar la compatibilidad y cotizar. */
export default function BuilderPage() {
  const parts = useBuildStore((state) => state.parts);
  const setPart = useBuildStore((state) => state.setPart);
  const removePart = useBuildStore((state) => state.removePart);
  const reset = useBuildStore((state) => state.reset);

  const analysis = useMemo(() => analyzeBuild(parts), [parts]);
  const [pickerCategory, setPickerCategory] = useState(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [notice, setNotice] = useState('');
  // Aviso con el que llega quien abre un armado guardado (viene en el estado de la navegación)
  const location = useLocation();
  const [openedNotice, setOpenedNotice] = useState(location.state?.notice ?? null);

  useEffect(() => {
    document.title = `Arma tu PC · ${PLATFORM_NAME}`;
  }, []);

  const handleSelect = (offer) => {
    setPart(offer);
    setPickerCategory(null);
    setNotice(`${offer.component.displayName} se agregó a tu armado.`);
  };

  const handleRemove = (category) => {
    const name = parts[category]?.component.displayName;
    removePart(category);
    if (name) setNotice(`${name} se quitó de tu armado.`);
  };

  const handleReset = () => {
    reset();
    setConfirmingReset(false);
    setNotice('Tu armado se restableció.');
  };

  const maxCooler = parts.case?.component.specs.maxCoolerHeightMm;
  const hints = {
    cooler:
      maxCooler != null
        ? `El gabinete elegido admite disipadores de hasta ${maxCooler} mm.`
        : undefined,
  };

  return (
    <Container size="wide" className="py-space-lg pb-28 lg:pb-space-lg">
      <p role="status" className="sr-only">
        {notice}
      </p>

      <div className="mb-space-lg flex flex-col justify-between gap-space-md pb-space-md md:flex-row md:items-end">
        <div className="space-y-space-xs">
          <p className="inline-flex items-center gap-1.5 rounded-md bg-surface-container px-2.5 py-1 text-code-metric text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-primary-container motion-safe:animate-pulse" />
            Motor de reglas activo · RC-01 a RC-08
          </p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Arma tu PC
          </h1>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            Validador de compatibilidad física, holgura de gabinete y balance eléctrico en tiempo
            real, con ofertas de tiendas locales de Colombia.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-space-sm">
          <button
            type="button"
            onClick={() => setQuoteOpen(true)}
            className="flex h-12 items-center gap-2 rounded-xl bg-surface-container px-space-md text-label-md text-on-surface transition-colors hover:bg-surface-variant"
          >
            <Icon name="description" className="text-[20px] text-primary" />
            <span>Vista cotización formal</span>
          </button>
          <ComingSoonButton
            icon="share"
            label="Exportar ID"
            className="h-12 bg-primary-container px-space-md text-on-primary-container"
          />
        </div>
      </div>

      <SummaryBar analysis={analysis} />

      <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
        <div className="space-y-space-lg lg:col-span-8">
          <RuleAlerts analysis={analysis} onPick={setPickerCategory} />

          <div className="flex items-center justify-between gap-space-sm pt-space-xs">
            <div className="flex items-center gap-2">
              <h2 className="text-label-sm uppercase tracking-wider text-outline">
                Ranuras de componentes
              </h2>
              <span className="tnum rounded-full bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant">
                {analysis.count} de {SLOTS.length} configuradas
              </span>
            </div>
            {analysis.count > 0 &&
              (confirmingReset ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="min-h-11 rounded-lg px-3 text-label-sm text-error transition-colors hover:bg-surface-container"
                  >
                    Sí, restablecer
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(false)}
                    className="min-h-11 rounded-lg px-3 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="flex min-h-11 items-center gap-1 text-label-sm text-primary transition-colors hover:text-on-primary-container"
                >
                  <Icon name="restart_alt" className="text-[16px]" />
                  <span>Restablecer todo</span>
                </button>
              ))}
          </div>

          {analysis.count === 0 && (
            <p className="rounded-2xl bg-surface-container p-space-md text-body-md text-on-surface-variant">
              Empieza por el procesador o la placa base: el resto de las piezas se filtran según lo
              que elijas.
            </p>
          )}

          <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
            {SLOTS.map((slot) => (
              <SlotCard
                key={slot.category}
                slot={slot}
                offer={parts[slot.category]}
                slotAnalysis={analysis.bySlot[slot.category]}
                hint={hints[slot.category]}
                onPick={setPickerCategory}
                onRemove={handleRemove}
              />
            ))}
          </div>

          <aside className="flex items-start gap-space-md rounded-2xl bg-surface-container p-space-md">
            <Icon name="verified" className="text-[24px] text-outline" />
            <p className="text-body-sm text-on-surface-variant">
              <strong className="font-medium text-on-surface">Transparencia de comercio:</strong>{' '}
              {PLATFORM_NAME} Colombia no almacena inventario ni procesa pagos. Te conectamos por
              WhatsApp con tiendas de Cali y Bogotá; la verificación confirma que el negocio existe,
              no que cumpla sus ofertas.
            </p>
          </aside>
        </div>

        <div className="lg:sticky lg:top-20 lg:col-span-4">
          <BuildSidebar
            analysis={analysis}
            parts={parts}
            onPick={setPickerCategory}
            onSave={() => setSaveOpen(true)}
          />
        </div>
      </div>

      <MobileBar analysis={analysis} />
      <PartPicker
        category={pickerCategory}
        onClose={() => setPickerCategory(null)}
        onSelect={handleSelect}
      />
      <SaveBuildDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        parts={parts}
        conflicts={analysis.failures.length}
      />
      {openedNotice && <Toast message={openedNotice} onClose={() => setOpenedNotice(null)} />}
      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        parts={parts}
        analysis={analysis}
      />
    </Container>
  );
}
