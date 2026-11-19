import { Link } from 'react-router';
import { BUILDCORES_REPO_URL, LICENSE_NAME } from '../shared/attribution.js';
import { PLATFORM_NAME } from '../shared/config.js';
import Container from '../shared/ui/Container.jsx';

const linkClass =
  'inline-flex min-h-11 items-center text-body-sm text-on-surface-variant transition-colors hover:text-on-surface md:min-h-0';

const navigation = [
  { to: '/catalogo', label: 'Explorador de Hardware' },
  { to: '/armador', label: 'Configurador de Ensambles' },
  { to: '/tiendas', label: 'Comercios Verificados' },
];

const legal = [
  { to: '/terminos', label: 'Términos' },
  { to: '/privacidad', label: 'Privacidad' },
  { to: '/atribucion', label: 'Atribución de datos' },
];

function LinkColumn({ title, links }) {
  return (
    <div className="space-y-space-xs md:col-span-3">
      <span className="block text-label-sm uppercase tracking-wider text-on-surface">{title}</span>
      <ul className="md:space-y-space-xs">
        {links.map(({ to, label }) => (
          <li key={to} className="list-none">
            <Link to={to} className={linkClass}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pie de página: descripción, navegación, enlaces legales y la atribución de BuildCores (CC BY-NC-SA 4.0). */
export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-outline-variant bg-surface-container">
      <Container className="py-space-xl">
        <div className="mb-space-xl grid grid-cols-1 gap-space-lg md:grid-cols-12">
          <div className="space-y-space-sm md:col-span-6">
            <span className="text-headline-sm text-on-surface">{PLATFORM_NAME} Colombia</span>
            <p className="max-w-md text-body-sm text-on-surface-variant">
              Plataforma técnica de agregación y verificación de compatibilidad física y eléctrica
              de hardware, con ofertas de tiendas locales de Colombia. No vendemos ni despachamos
              componentes directamente.
            </p>
          </div>
          <LinkColumn title="Navegación" links={navigation} />
          <LinkColumn title="Institucional y Legal" links={legal} />
        </div>

        <div className="flex flex-col items-center justify-between gap-space-sm border-t border-outline-variant pt-space-md text-on-surface-variant md:flex-row">
          <p className="text-center text-body-sm md:text-left">
            Datos de componentes:{' '}
            <a
              href={BUILDCORES_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-on-surface hover:underline"
            >
              BuildCores OpenDB ({LICENSE_NAME})
            </a>{' '}
            · Plataforma educativa, sin fines comerciales.
          </p>
          <p className="text-center text-body-sm text-outline md:text-right">
            © 2026 {PLATFORM_NAME} Colombia. Agregador algorítmico independiente.
          </p>
        </div>
      </Container>
    </footer>
  );
}
