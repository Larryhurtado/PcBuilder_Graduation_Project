import Icon from '../../shared/ui/Icon.jsx';

/**
 * Compartir la ficha: llega más adelante, así que por ahora se ve deshabilitado.
 * @param {{ name: string, className?: string }} props nombre de la pieza, para el nombre accesible
 */
export function ShareButton({ name, className = '' }) {
  return (
    <button
      type="button"
      disabled
      aria-label={`Compartir ${name} (próximamente)`}
      title="Compartir: próximamente"
      className={`flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-xl text-outline opacity-60 ${className}`}
    >
      <Icon name="share" className="text-[20px]" />
    </button>
  );
}

/**
 * "Al ensamble" (HU-11): agrega la pieza al armador, reemplazando la de su categoría. Si esa misma
 * oferta ya está en el armado se muestra como tal.
 * @param {{ offer: { component: { displayName: string } }, inBuild: boolean, replaces: boolean, onAdd: (offer: any) => void, className?: string }} props
 */
export function AddToBuildButton({ offer, inBuild, replaces, onAdd, className = '' }) {
  const name = offer.component.displayName;

  if (inBuild) {
    return (
      <span
        className={`flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-surface px-2.5 text-label-sm text-compatible ${className}`}
      >
        <Icon name="check_circle" className="text-[18px]" />
        <span>En tu armado</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAdd(offer)}
      aria-label={`${replaces ? 'Cambiar en el armado por' : 'Agregar al armado'} ${name}`}
      className={`flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-outline-variant bg-surface px-2.5 text-label-sm text-on-surface transition-colors hover:border-outline hover:bg-surface-variant motion-reduce:transition-none ${className}`}
    >
      <Icon name={replaces ? 'swap_horiz' : 'add_circle'} className="text-[18px]" />
      <span>{replaces ? 'Reemplazar' : 'Al ensamble'}</span>
    </button>
  );
}
