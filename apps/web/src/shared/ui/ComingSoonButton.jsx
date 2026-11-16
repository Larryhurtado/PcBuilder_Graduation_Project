import Icon from './Icon.jsx';

/**
 * Botón de una función que todavía no existe: se ve deshabilitado y dice "Próximamente".
 * @param {{ icon: string, label: string, className?: string }} props
 */
export default function ComingSoonButton({ icon, label, className = '' }) {
  return (
    <button
      type="button"
      disabled
      title="Próximamente"
      className={`flex cursor-not-allowed items-center justify-center gap-2 rounded-xl text-label-md opacity-70 ${className}`}
    >
      <Icon name={icon} className="text-[18px]" />
      <span className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider opacity-90">
          Próximamente
        </span>
      </span>
    </button>
  );
}
