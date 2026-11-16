import { Fragment } from 'react';
import Icon from '../../shared/ui/Icon.jsx';
import { alertLabel, lowerFirst, ruleNames, SUGGESTED_FIX } from './analysis.js';
import { slotByCategory } from './slots.js';

// Tinte de cada aviso mezclado con la superficie de la tarjeta (sin transparencias sobre el fondo)
const failBg =
  'bg-[color-mix(in_srgb,var(--color-incompatible)_8%,var(--color-surface-container))]';
const warnBg =
  'bg-[color-mix(in_srgb,var(--color-unverifiable)_8%,var(--color-surface-container))]';

/** Resalta las medidas del mensaje del motor ("338 mm", "750 W") con negrita. */
function Measures({ text }) {
  return text.split(/(\d+(?:[.,]\d+)?\s?(?:mm|W|GB))/).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="tnum font-semibold">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/**
 * Avisos de reglas: primero los conflictos, luego los datos faltantes y, al final, una línea con
 * lo que se verificó sin problemas.
 * @param {{ analysis: ReturnType<typeof import('./analysis.js').analyzeBuild>, onPick: (category: string) => void }} props
 */
export default function RuleAlerts({ analysis, onPick }) {
  const { failures, unknowns, oks } = analysis;
  if (failures.length + unknowns.length + oks.length === 0) return null;

  return (
    <section aria-label="Avisos de reglas" className="space-y-space-xs">
      {failures.map((result) => {
        const fix = SUGGESTED_FIX[result.code];
        return (
          <div
            key={result.code}
            role="alert"
            className={`flex flex-col items-start justify-between gap-space-md rounded-2xl p-space-md sm:flex-row ${failBg}`}
          >
            <div className="flex items-start gap-space-sm">
              <Icon name="error" className="mt-0.5 shrink-0 text-[24px] text-incompatible" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-incompatible/20 px-2 py-0.5 text-[11px] font-bold text-incompatible">
                    {alertLabel(result)} • {result.code}
                  </span>
                  <span className="text-[12px] text-incompatible">{ruleNames[result.code]}</span>
                </div>
                <p className="text-body-sm text-on-surface">
                  <Measures text={result.message} />
                </p>
              </div>
            </div>
            {fix && (
              <button
                type="button"
                onClick={() => onPick(fix)}
                className="flex min-h-11 shrink-0 items-center gap-1 self-end rounded-lg bg-surface px-3 py-1.5 text-label-sm text-on-surface transition-colors hover:bg-surface-variant sm:self-center"
              >
                <span>Ver {slotByCategory[fix].plural} compatibles</span>
                <Icon name="chevron_right" className="text-[16px]" />
              </button>
            )}
          </div>
        );
      })}

      {unknowns.map((result) => (
        <div
          key={result.code}
          className={`flex items-start gap-space-sm rounded-2xl p-space-md ${warnBg}`}
        >
          <Icon name="warning" className="mt-0.5 shrink-0 text-[22px] text-unverifiable" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-unverifiable/20 px-2 py-0.5 text-[11px] font-bold text-unverifiable">
                {alertLabel(result)} • {result.code}
              </span>
              <span className="text-[12px] text-on-surface-variant">{ruleNames[result.code]}</span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              No verificable: {lowerFirst(result.message)}; confírmalo con la tienda.
            </p>
          </div>
        </div>
      ))}

      {oks.length > 0 && (
        <div className="flex items-center justify-between gap-space-sm rounded-xl bg-surface-container p-space-sm px-space-md">
          <div className="flex items-start gap-2">
            <Icon name="task_alt" className="mt-px text-[20px] text-compatible" />
            <p className="text-code-metric text-on-surface">
              <strong className="text-compatible">
                VERIFICADO • {oks.map((result) => result.code).join(', ')}:
              </strong>{' '}
              {oks.map((result) => ruleNames[result.code]).join(', ')}, sin conflictos.
            </p>
          </div>
          <span className="hidden shrink-0 text-[11px] text-outline sm:inline">Check OK</span>
        </div>
      )}
    </section>
  );
}
