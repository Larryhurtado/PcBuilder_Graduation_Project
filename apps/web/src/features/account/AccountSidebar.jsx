import { Link } from 'react-router';
import { logout } from '../../shared/session/actions.js';
import { initials } from '../../shared/lib/format.js';
import Icon from '../../shared/ui/Icon.jsx';
import { useMyBuilds, useMyWishlist } from './queries.js';

export const roleLabels = { buyer: 'Comprador', seller: 'Vendedor', admin: 'Administrador' };

const itemClass =
  'flex min-h-11 w-full items-center gap-space-sm rounded-xl px-space-sm text-label-md transition-colors motion-reduce:transition-none';

/** Cantidad al lado de un enlace: espera con "…" y se omite si la consulta falla. */
function Count({ query }) {
  if (query.isError) return null;
  return (
    <span className="tnum ml-auto rounded-full bg-surface px-2.5 py-0.5 text-label-sm text-on-surface-variant">
      {query.isSuccess ? query.data.items.length : '…'}
    </span>
  );
}

/**
 * Tarjeta de la persona y menú de la cuenta. Los contadores salen de GET /me/builds y
 * GET /me/wishlist.
 * @param {{ user: { id: string, email: string, fullName: string, role: 'buyer' | 'seller' | 'admin' } }} props
 */
export default function AccountSidebar({ user }) {
  const builds = useMyBuilds(user.id);
  const wishlist = useMyWishlist(user.id);

  return (
    <div className="space-y-space-md">
      <div className="space-y-space-md rounded-2xl bg-surface-container p-space-md">
        <div className="flex items-center gap-space-sm">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-headline-sm text-on-primary-container"
          >
            {initials(user.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-headline-sm text-on-surface">{user.fullName}</p>
            <p className="truncate text-body-sm text-on-surface-variant" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>
        <p className="inline-flex items-center gap-1 rounded bg-surface px-2 py-0.5 text-label-sm text-on-surface-variant">
          <Icon name="badge" className="text-[14px]" />
          Cuenta de {roleLabels[user.role].toLowerCase()}
        </p>
      </div>

      <nav aria-label="Menú de la cuenta" className="rounded-2xl bg-surface-container p-space-xs">
        <ul className="space-y-1">
          <li>
            <Link
              to="/cuenta"
              aria-current="page"
              className={`${itemClass} bg-primary-container text-on-primary-container`}
            >
              <Icon name="person" className="text-[20px]" />
              Mi perfil
            </Link>
          </li>
          <li>
            <Link
              to="/cuenta/armados"
              className={`${itemClass} text-on-surface-variant hover:bg-surface-variant hover:text-on-surface`}
            >
              <Icon name="computer" className="text-[20px]" />
              Mis armados
              <Count query={builds} />
            </Link>
          </li>
          <li>
            <Link
              to="/cuenta/favoritos"
              className={`${itemClass} text-on-surface-variant hover:bg-surface-variant hover:text-on-surface`}
            >
              <Icon name="favorite" className="text-[20px]" />
              Favoritos
              <Count query={wishlist} />
            </Link>
          </li>
          {user.role === 'buyer' && (
            <li>
              <Link
                to="/vender"
                className={`${itemClass} text-on-surface-variant hover:bg-surface-variant hover:text-on-surface`}
              >
                <Icon name="storefront" className="text-[20px]" />
                Ser vendedor
              </Link>
            </li>
          )}
          <li className="border-t border-outline-variant/40 pt-1">
            <button
              type="button"
              onClick={logout}
              className={`${itemClass} text-on-surface-variant hover:bg-surface-variant hover:text-on-surface`}
            >
              <Icon name="logout" className="text-[20px]" />
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
