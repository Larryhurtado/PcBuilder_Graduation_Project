import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { PLATFORM_NAME } from '../shared/config.js';
import { useSession } from '../shared/session/useSession.js';
import CategoryIcon from '../shared/ui/CategoryIcon.jsx';
import Container from '../shared/ui/Container.jsx';
import Icon from '../shared/ui/Icon.jsx';
import SearchForm from './SearchForm.jsx';

export const navLinks = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/armador', label: 'Asistente' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/tiendas', label: 'Tiendas' },
];

const desktopLink = ({ isActive }) =>
  `relative text-label-md transition-colors motion-reduce:transition-none ${
    isActive
      ? 'font-semibold text-on-surface after:absolute after:-bottom-5 after:left-0 after:right-0 after:h-0.5 after:bg-primary-container'
      : 'text-on-surface-variant hover:text-on-surface'
  }`;

const mobileLink = ({ isActive }) =>
  `flex h-11 items-center rounded-xl px-space-md text-label-md transition-colors motion-reduce:transition-none ${
    isActive
      ? 'bg-surface-variant font-semibold text-on-surface'
      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
  }`;

/** Barra superior persistente (HU-03): logo, navegación, buscador y acceso a la cuenta. */
export default function Navbar() {
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant bg-surface-container">
      <Container className="flex h-16 items-center justify-between gap-space-md">
        <Link
          to="/"
          onClick={closeMenu}
          className="flex min-h-11 shrink-0 items-center gap-space-sm text-headline-sm tracking-tight text-on-surface transition-colors hover:text-primary"
        >
          <CategoryIcon category="cpu" className="h-7 w-7 text-primary" />
          <span>{PLATFORM_NAME}</span>
          <span className="rounded-sm border border-outline-variant bg-surface-variant px-space-xs py-0.5 text-code-metric text-on-surface-variant">
            COL
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-space-lg md:flex">
          {navLinks.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={desktopLink}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-space-sm">
          <SearchForm shortcut className="hidden sm:flex" inputClassName="sm:w-48 lg:w-64" />
          {user ? (
            <Link
              to="/cuenta"
              aria-label="Mi cuenta"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary"
            >
              <Icon name="person" className="text-[18px]" />
            </Link>
          ) : (
            <Link
              to="/ingresar"
              className="flex h-11 items-center justify-center rounded-xl border border-outline-variant px-space-md text-label-md md:h-10 text-on-surface transition-colors hover:border-outline hover:bg-surface-variant motion-reduce:transition-none"
            >
              Ingresar
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-outline-variant text-on-surface transition-colors hover:bg-surface-variant md:hidden"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} className="text-[22px]" />
          </button>
        </div>
      </Container>

      {menuOpen && (
        <div
          id="menu-movil"
          className="border-t border-outline-variant bg-surface-container md:hidden"
        >
          <Container className="flex flex-col gap-space-sm py-space-md">
            <SearchForm className="sm:hidden" onSubmitted={closeMenu} />
            <nav aria-label="Principal móvil" className="flex flex-col gap-space-xs">
              {navLinks.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end} onClick={closeMenu} className={mobileLink}>
                  {label}
                </NavLink>
              ))}
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
