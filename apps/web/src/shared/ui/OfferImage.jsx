import CategoryIcon from './CategoryIcon.jsx';

/**
 * Foto de la oferta. Mientras no tenga foto muestra el icono de su categoría. El contenido que va
 * encima (etiquetas) se pasa como `children`.
 * @param {{ offer: { coverImageUrl: string | null, component: { category: string } }, className?: string, iconClassName?: string, children?: import('react').ReactNode }} props
 */
export default function OfferImage({
  offer,
  className = 'h-36',
  iconClassName = 'h-14 w-14',
  children,
}) {
  return (
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-surface-container-low p-3 ${className}`}
    >
      {offer.coverImageUrl ? (
        <img
          src={offer.coverImageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <CategoryIcon
          category={offer.component.category}
          className={`${iconClassName} text-outline-variant`}
        />
      )}
      {children}
    </div>
  );
}
