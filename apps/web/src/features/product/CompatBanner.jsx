import { Link } from 'react-router';
import Icon from '../../shared/ui/Icon.jsx';
import { candidateStatus, lowerFirst, ruleNames } from '../builder/analysis.js';

const okBg = 'bg-[color-mix(in_srgb,var(--color-compatible)_8%,var(--color-surface-container))]';
const failBg =
  'bg-[color-mix(in_srgb,var(--color-incompatible)_8%,var(--color-surface-container))]';
const warnBg =
  'bg-[color-mix(in_srgb,var(--color-unverifiable)_8%,var(--color-surface-container))]';

/**
 * Cómo encaja esta pieza en el armado en curso (HU-06). Con el armado vacío invita a armarlo.
 * @param {{ component: { id: string, category: string, specs: Record<string, any> }, parts: Record<string, any> }} props
 */
export default function CompatBanner({ component, parts }) {
  const { category, specs } = component;
  const inBuild = parts[category]?.component.id === component.id;
  const others = Object.keys(parts).filter((key) => key !== category);

  if (others.length === 0) {
    return (
      <section
        aria-label="Compatibilidad con tu armado"
        className="flex flex-wrap items-center justify-between gap-space-sm rounded-2xl bg-surface-container p-space-md"
      >
        <div className="flex items-start gap-space-sm">
          <Icon name="info" className="mt-0.5 text-[22px] text-outline" />
          <div>
            <p className="text-label-md text-on-surface">Compatibilidad con tu armado</p>
            <p className="text-body-sm text-on-surface-variant">
              {inBuild
                ? 'Esta pieza es la única de tu armado por ahora.'
                : 'Aún no hay otras piezas en tu armado con las que compararla.'}
            </p>
          </div>
        </div>
        <Link
          to="/armador"
          className="flex min-h-11 items-center rounded-lg px-3 text-label-sm text-primary hover:bg-surface"
        >
          Ir al armador
        </Link>
      </section>
    );
  }

  const { status, results } = candidateStatus(category, specs, parts);
  const failures = results.filter((result) => result.status === 'fail');
  const unknowns = results.filter((result) => result.status === 'unknown');
  const oks = results.filter((result) => result.status === 'ok');

  if (status === 'none') {
    return (
      <section
        aria-label="Compatibilidad con tu armado"
        className="flex items-start gap-space-sm rounded-2xl bg-surface-container p-space-md"
      >
        <Icon name="info" className="mt-0.5 text-[22px] text-outline" />
        <p className="text-body-sm text-on-surface-variant">
          Ninguna regla de compatibilidad aplica entre esta pieza y las de tu armado todavía.
        </p>
      </section>
    );
  }

  const view =
    status === 'fail'
      ? {
          bg: failBg,
          icon: 'error',
          color: 'text-incompatible',
          title: 'Incompatible con tu armado en curso',
        }
      : status === 'unknown'
        ? {
            bg: warnBg,
            icon: 'warning',
            color: 'text-unverifiable',
            title: 'No verificable con tu armado en curso',
          }
        : {
            bg: okBg,
            icon: 'check_circle',
            color: 'text-compatible',
            title: 'Compatible con tu armado en curso',
          };

  return (
    <section
      aria-label="Compatibilidad con tu armado"
      role={status === 'fail' ? 'alert' : undefined}
      className={`flex items-start gap-space-sm rounded-2xl p-space-md ${view.bg}`}
    >
      <Icon name={view.icon} className={`mt-0.5 shrink-0 text-[24px] ${view.color}`} />
      <div className="min-w-0 space-y-1">
        <p className={`text-headline-sm ${view.color}`}>{view.title}</p>
        <ul className="space-y-1 text-body-sm text-on-surface">
          {failures.map((result) => (
            <li key={result.code}>{result.message}</li>
          ))}
          {unknowns.map((result) => (
            <li key={result.code} className="text-on-surface-variant">
              No verificable: {lowerFirst(result.message)}; confírmalo con la tienda.
            </li>
          ))}
        </ul>
        {oks.length > 0 && (
          <p className="text-code-metric text-on-surface-variant">
            Verificado: {oks.map((result) => ruleNames[result.code]).join(', ')}.
          </p>
        )}
      </div>
    </section>
  );
}
