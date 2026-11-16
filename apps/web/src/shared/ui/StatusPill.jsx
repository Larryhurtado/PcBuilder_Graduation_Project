import Icon from './Icon.jsx';

const styles = {
  ok: { icon: 'check', box: 'bg-compatible/12 text-compatible' },
  fail: { icon: 'close', box: 'bg-incompatible/15 text-incompatible font-semibold' },
  unknown: { icon: 'help', box: 'bg-unverifiable/15 text-unverifiable' },
};

/**
 * Estado de compatibilidad: siempre icono y texto, nunca solo color.
 * `ok` = compatible, `fail` = incompatible, `unknown` = no verificable (falta un dato).
 * @param {{ status: 'ok' | 'fail' | 'unknown', children: import('react').ReactNode, className?: string }} props
 */
export default function StatusPill({ status, children, className = '' }) {
  const { icon, box } = styles[status];
  return (
    <span
      className={`inline-flex items-start gap-1 rounded px-2 py-0.5 text-[11px] font-medium leading-snug ${box} ${className}`}
    >
      <Icon name={icon} className="mt-px text-[13px]" />
      <span>{children}</span>
    </span>
  );
}
