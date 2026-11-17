/**
 * Icono de Material Symbols Outlined (la misma familia que usan las pantallas de Stitch).
 * Es decorativo: el texto o la etiqueta del control que lo contiene dice la acción.
 * `filled` usa la versión rellena del icono (por ejemplo el corazón de un favorito activo).
 * @param {{ name: string, className?: string, filled?: boolean }} props nombre del icono y clases (tamaño: text-[18px])
 */
export default function Icon({ name, className = '', filled = false }) {
  return (
    <span
      className={`material-symbols-outlined select-none leading-none ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
