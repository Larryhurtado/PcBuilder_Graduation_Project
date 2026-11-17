import { Link, useLocation } from 'react-router';
import Icon from '../../shared/ui/Icon.jsx';
import { useFavorites } from './useFavorites.js';

const base =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors motion-reduce:transition-none';

/**
 * Corazón de favoritos. Con sesión guarda o quita el componente (el botón dice si está activo);
 * sin sesión lleva a ingresar y vuelve a esta misma página.
 * @param {{ component: { id: string, category: string, brand: string, model: string, displayName: string, minPriceCop?: number | null, offersCount?: number }, className?: string }} props
 */
export default function FavoriteButton({ component, className = '' }) {
  const { user, isLoading, isFavorite, isPending, toggle } = useFavorites();
  const location = useLocation();
  const name = component.displayName;

  if (isLoading) {
    return (
      <button
        type="button"
        disabled
        aria-busy="true"
        aria-label={`Guardar ${name} en favoritos`}
        className={`${base} cursor-wait text-outline opacity-60 ${className}`}
      >
        <Icon name="favorite" className="text-[20px]" />
      </button>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <Link
        to={`/ingresar?next=${next}`}
        aria-label={`Ingresa para guardar ${name} en favoritos`}
        title="Ingresa para guardar en favoritos"
        className={`${base} text-outline hover:bg-surface-variant hover:text-on-surface ${className}`}
      >
        <Icon name="favorite" className="text-[20px]" />
      </Link>
    );
  }

  const active = isFavorite(component.id);
  return (
    <button
      type="button"
      onClick={() => toggle(component)}
      aria-pressed={active}
      aria-disabled={isPending(component.id) || undefined}
      aria-label={`Guardar ${name} en favoritos`}
      title={active ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      className={`${base} hover:bg-surface-variant ${
        active ? 'text-primary' : 'text-outline hover:text-on-surface'
      } ${className}`}
    >
      <Icon name="favorite" filled={active} className="text-[20px]" />
    </button>
  );
}
