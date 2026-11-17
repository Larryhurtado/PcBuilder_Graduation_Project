import { useEffect } from 'react';
import { Link } from 'react-router';
import { PLATFORM_NAME } from '../../shared/config.js';
import { useSession } from '../../shared/session/useSession.js';
import Container from '../../shared/ui/Container.jsx';
import AccountSidebar from './AccountSidebar.jsx';
import { DangerZone, ProfileSection, SecuritySection } from './sections.jsx';

/** Mi cuenta (/cuenta): datos de la persona y su menú. La guarda de ruta garantiza que hay sesión. */
export default function AccountPage() {
  const { user } = useSession();

  useEffect(() => {
    document.title = `Mi cuenta · ${PLATFORM_NAME}`;
  }, []);

  if (!user) return null;

  return (
    <Container size="wide" className="space-y-space-lg py-space-lg">
      <nav aria-label="Ruta de navegación" className="text-body-sm text-on-surface-variant">
        <ol className="flex items-center gap-2">
          <li>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center hover:text-on-surface hover:underline md:min-h-0"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden="true" className="text-outline-variant">
            /
          </li>
          <li aria-current="page" className="text-on-surface">
            Mi cuenta
          </li>
        </ol>
      </nav>

      <div className="space-y-space-xs">
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">Mi cuenta</h1>
        <p className="max-w-2xl text-body-md text-on-surface-variant">
          Gestiona tus datos de acceso y tus preferencias.
        </p>
      </div>

      <div className="grid items-start gap-space-lg lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside aria-label="Perfil" className="lg:sticky lg:top-20">
          <AccountSidebar user={user} />
        </aside>
        <div className="min-w-0 space-y-space-lg">
          <ProfileSection user={user} />
          <SecuritySection />
          <DangerZone />
        </div>
      </div>
    </Container>
  );
}
