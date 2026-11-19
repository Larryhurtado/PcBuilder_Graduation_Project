import Container from '../../shared/ui/Container.jsx';
import { BRAND_LOGOS } from './brandLogos.js';

export const brands = [
  'AMD',
  'Intel',
  'NVIDIA',
  'ASUS',
  'MSI',
  'Corsair',
  'Gigabyte',
  'Kingston',
  'Seasonic',
];

/** Una marca: su logo en una sola tinta (el color del texto) o, si no hay logo, su nombre. */
function Brand({ name, decorative }) {
  const logo = BRAND_LOGOS[name];
  return (
    <li className="flex h-8 w-28 shrink-0 items-center justify-center transition-colors hover:text-on-surface">
      {logo ? (
        <svg
          viewBox={logo.viewBox}
          fill="currentColor"
          preserveAspectRatio="xMidYMid meet"
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : name}
          aria-hidden={decorative ? 'true' : undefined}
          className="h-full w-full"
        >
          <path d={logo.path} />
        </svg>
      ) : (
        <span className="text-label-md uppercase tracking-widest">{name}</span>
      )}
    </li>
  );
}

/**
 * Franja de marcas de la base maestra: un carrusel infinito en una sola línea. La lista se repite
 * dos veces para que el bucle no tenga saltos; la copia es solo visual (oculta a los lectores de
 * pantalla). Se pausa al pasar el cursor o al enfocarla con el teclado, y con movimiento reducido
 * no se mueve: las marcas se acomodan en filas. La nota va debajo, en letra pequeña.
 */
export default function BrandStrip() {
  return (
    <section aria-label="Marcas disponibles" className="w-full">
      <div className="w-full bg-surface-container-low py-space-sm">
        <Container>
          <div className="group overflow-hidden text-on-surface-variant [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] hover:[&_.brand-track]:[animation-play-state:paused] focus-within:[&_.brand-track]:[animation-play-state:paused] motion-reduce:[mask-image:none]">
            <div className="brand-track flex w-max animate-brand-scroll motion-reduce:w-full motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center">
              <ul className="flex shrink-0 items-center gap-space-xl px-space-md motion-reduce:flex-wrap motion-reduce:justify-center">
                {brands.map((name) => (
                  <Brand key={name} name={name} />
                ))}
              </ul>
              <ul
                aria-hidden="true"
                className="flex shrink-0 items-center gap-space-xl px-space-md motion-reduce:hidden"
              >
                {brands.map((name) => (
                  <Brand key={name} name={name} decorative />
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </div>
      <p className="px-space-md pt-space-xs text-center text-label-sm text-outline">
        Marcas de fabricantes presentes en el catálogo. No indican respaldo ni alianza.
      </p>
    </section>
  );
}
