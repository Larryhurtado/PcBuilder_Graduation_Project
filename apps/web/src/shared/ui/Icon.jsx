/**
 * Icono de Material Symbols Outlined (la misma familia que usan las pantallas de Stitch).
 * Es decorativo: el texto o la etiqueta del control que lo contiene dice la acción.
 * @param {{ name: string, className?: string }} props nombre del icono y clases (tamaño: text-[18px])
 */
export default function Icon({ name, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined select-none leading-none ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
