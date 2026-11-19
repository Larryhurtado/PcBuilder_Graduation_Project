import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { PLATFORM_NAME } from '../../shared/config.js';
import { initials } from '../../shared/lib/format.js';
import { logout } from '../../shared/session/actions.js';
import { useSession } from '../../shared/session/useSession.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import Dialog from '../../shared/ui/Dialog.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import NoticeHost from '../../shared/ui/NoticeHost.jsx';
import { useMyStore, useVerificationStatus } from './queries.js';
import { describeVerification, TONES } from './verification.js';

const NAV = [
  { to: '/vendedor', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/vendedor/inventario', label: 'Inventario', icon: 'inventory_2' },
  { to: '/vendedor/publicar', label: 'Publicar producto', icon: 'add_circle' },
  { to: '/vendedor/verificacion', label: 'Verificación', icon: 'verified_user', alert: true },
  { to: '/vendedor/metricas', label: 'Métricas y clics', icon: 'monitoring' },
  { to: '/vendedor/negocio', label: 'Ajustes de tienda', icon: 'settings' },
];

const itemClass =
  'flex min-h-11 w-full items-center gap-space-sm rounded-xl px-space-sm text-label-md transition-colors motion-reduce:transition-none';

function Nav({ onNavigate, unverified }) {
  return (
    <nav aria-label="Panel comercial" className="space-y-1">
      <p className="px-space-sm pb-1 text-[10px] font-semibold uppercase tracking-wider text-outline">
        Panel comercial
      </p>
      {NAV.map((item) =>
        item.soon ? (
          <button
            key={item.label}
            type="button"
            disabled
            title="Próximamente"
            className={`${itemClass} cursor-not-allowed text-on-surface-variant opacity-60`}
          >
            <Icon name={item.icon} className="text-[20px]" />
            <span className="flex flex-col items-start leading-tight">
              <span>{item.label}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider">Próximamente</span>
            </span>
          </button>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `${itemClass} ${
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`
            }
          >
            <Icon name={item.icon} className="text-[20px]" />
            {item.label}
            {item.alert && unverified && (
              <span
                role="img"
                aria-label="Pendiente"
                className="ml-auto h-2 w-2 rounded-full bg-unverifiable"
              />
            )}
          </NavLink>
        ),
      )}
    </nav>
  );
}

/** Tarjeta del negocio al pie del menú: nombre, estado, portal público y salir. */
function StoreCard({ store, verification, onNavigate }) {
  const view = verification ? describeVerification(verification) : null;
  return (
    <div className="space-y-space-sm rounded-2xl bg-surface-container p-space-sm">
      <div className="flex items-center gap-space-sm">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-label-md text-primary"
        >
          {initials(store?.tradeName ?? 'Mi negocio')}
        </span>
        <div className="min-w-0">
          <p className="truncate text-label-md text-on-surface">
            {store?.tradeName ?? 'Mi negocio'}
          </p>
          {view && (
            <p
              className={`flex items-center gap-1 text-[11px] font-medium ${TONES[view.tone].text}`}
            >
              <Icon name={TONES[view.tone].icon} className="text-[13px]" />
              {view.chip}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-space-xs text-body-sm">
        <Link
          to={verification?.status === 'approved' && store ? `/tiendas/${store.id}` : '/tiendas'}
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-on-surface-variant hover:bg-surface hover:text-on-surface"
        >
          <Icon name="open_in_new" className="text-[16px]" />
          Portal público
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-on-surface-variant hover:bg-surface hover:text-on-surface"
        >
          <Icon name="logout" className="text-[16px]" />
          Salir
        </button>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/vendedor" className="flex min-h-11 items-center gap-space-sm text-on-surface">
      <CategoryIcon category="cpu" className="h-7 w-7 text-primary" />
      <span className="leading-tight">
        <span className="block text-headline-sm">{PLATFORM_NAME}</span>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary">
          Portal B2B
        </span>
      </span>
    </Link>
  );
}

/**
 * Marco del portal del vendedor (/vendedor/*): menú lateral, barra superior con el negocio y su
 * estado de verificación, y pie con la atribución de los datos. Lo comparten todas las pantallas
 * del vendedor. En pantallas pequeñas el menú se abre desde un botón.
 */
export default function SellerLayout() {
  const { user } = useSession();
  const store = useMyStore(user?.id);
  const verification = useVerificationStatus(user?.id);
  const [menuOpen, setMenuOpen] = useState(false);

  const view = verification.data ? describeVerification(verification.data) : null;
  const place = [store.data?.commercialCenter, store.data?.city].filter(Boolean).join(' · ');
  const unverified = Boolean(verification.data) && verification.data.status !== 'approved';
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-space-md focus:top-space-md focus:z-[60] focus:rounded-xl focus:bg-primary-container focus:px-space-md focus:py-space-sm focus:text-on-primary-container"
      >
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between gap-space-lg border-r border-outline-variant bg-surface-container-low p-space-md lg:flex">
        <div className="space-y-space-lg">
          <Brand />
          <Nav unverified={unverified} />
        </div>
        <StoreCard store={store.data} verification={verification.data} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-space-sm border-b border-outline-variant bg-surface-container px-space-md lg:px-space-lg">
          <div className="flex min-w-0 items-center gap-space-sm">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir el menú del panel"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface hover:bg-surface-variant lg:hidden"
            >
              <Icon name="menu" className="text-[22px]" />
            </button>
            <Icon name="storefront" className="hidden text-[22px] text-outline sm:block" />
            <p className="truncate text-headline-sm text-on-surface">
              {store.data?.tradeName ?? 'Mi negocio'}
            </p>
            {place && (
              <span className="hidden rounded-lg border border-outline-variant bg-surface px-2 py-1 text-code-metric text-on-surface-variant md:inline">
                {place}
              </span>
            )}
            {view && (
              <Link
                to="/vendedor/verificacion"
                title="Ver el estado de verificación"
                className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-label-sm sm:inline-flex ${TONES[view.tone].chip}`}
              >
                <Icon name={TONES[view.tone].icon} className="text-[14px]" />
                {view.chip}
              </Link>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-space-xs">
            <Link
              to={
                verification.data?.status === 'approved' && store.data
                  ? `/tiendas/${store.data.id}`
                  : '/tiendas'
              }
              className="hidden min-h-11 items-center gap-1.5 rounded-xl px-3 text-label-md text-on-surface-variant hover:bg-surface-variant hover:text-on-surface md:flex"
            >
              <Icon name="travel_explore" className="text-[18px]" />
              Directorio público
            </Link>
            <button
              type="button"
              disabled
              aria-label="Notificaciones (próximamente)"
              title="Notificaciones: próximamente"
              className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-xl text-outline opacity-60"
            >
              <Icon name="notifications" className="text-[20px]" />
            </button>
            <Link
              to="/cuenta"
              aria-label="Mi cuenta"
              title={user?.fullName}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-label-md text-on-primary"
            >
              {initials(user?.fullName)}
            </Link>
          </div>
        </header>

        <main id="contenido" className="w-full flex-1">
          <Outlet />
        </main>

        <footer className="border-t border-outline-variant bg-surface-container-low px-space-md py-space-md text-body-sm text-on-surface-variant lg:px-space-lg">
          Datos de componentes: <strong className="text-on-surface">BuildCores OpenDB</strong> (CC
          BY-NC-SA 4.0) · Plataforma educativa, sin fines comerciales.
        </footer>
      </div>

      <Dialog open={menuOpen} onClose={closeMenu} variant="drawer" labelledBy="menu-portal-titulo">
        <div className="flex min-h-full flex-col justify-between gap-space-lg p-space-md">
          <div className="space-y-space-lg">
            <div className="flex items-center justify-between">
              <h2 id="menu-portal-titulo" className="sr-only">
                Menú del portal del vendedor
              </h2>
              <Brand />
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Cerrar el menú"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-outline hover:bg-surface hover:text-on-surface"
              >
                <Icon name="close" className="text-[22px]" />
              </button>
            </div>
            <Nav onNavigate={closeMenu} unverified={unverified} />
          </div>
          <StoreCard store={store.data} verification={verification.data} onNavigate={closeMenu} />
        </div>
      </Dialog>

      <NoticeHost />
    </div>
  );
}
