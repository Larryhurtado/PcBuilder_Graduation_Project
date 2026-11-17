import Icon from '../../shared/ui/Icon.jsx';
import { percentChange } from './ranges.js';

export const number = new Intl.NumberFormat('es-CO');
export const percent = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

/** Superficie de una tarjeta del portal. */
export const card = 'rounded-2xl bg-surface-container p-space-lg';

/** Cambio contra el periodo anterior, con flecha y signo (no solo color). */
export function Delta({ current, previous }) {
  const change = percentChange(current, previous);
  if (change === null) {
    return <p className="text-body-sm text-outline">Sin datos del periodo anterior</p>;
  }
  const up = change >= 0;
  return (
    <p className="tnum flex flex-wrap items-center gap-x-2 text-body-sm">
      <span
        className={`flex items-center gap-1 whitespace-nowrap ${up ? 'text-compatible' : 'text-incompatible'}`}
      >
        <Icon name={up ? 'trending_up' : 'trending_down'} className="text-[16px]" />
        {up ? '+' : '−'}
        {percent.format(Math.abs(change))} %
      </span>
      <span className="text-on-surface-variant">vs. periodo anterior</span>
    </p>
  );
}

/** Indicador del panel: etiqueta, ícono, valor grande y un detalle opcional debajo. */
export function Kpi({ label, icon, value, loading, children }) {
  return (
    <div className={`${card} space-y-space-sm`}>
      <div className="flex items-center justify-between gap-space-sm">
        <p className="text-label-md text-on-surface-variant">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-outline">
          <Icon name={icon} className="text-[20px]" />
        </span>
      </div>
      <p className="tnum text-headline-lg-mobile text-on-surface md:text-headline-lg">
        {loading ? (
          <span className="inline-block h-9 w-24 rounded bg-surface-variant motion-safe:animate-pulse" />
        ) : (
          value
        )}
      </p>
      {children}
    </div>
  );
}
