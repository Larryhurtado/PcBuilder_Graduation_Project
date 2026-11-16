const chips = {
  new: { label: 'Nuevo', className: 'bg-surface-variant text-on-surface' },
  used: { label: 'Usado', className: 'bg-surface-variant font-semibold text-tertiary' },
};

/**
 * Condición de la oferta: "Nuevo" o "Usado".
 * @param {{ condition: 'new' | 'used', className?: string }} props
 */
export default function ConditionChip({ condition, className = '' }) {
  const chip = chips[condition];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-label-sm ${chip.className} ${className}`}>
      {chip.label}
    </span>
  );
}
