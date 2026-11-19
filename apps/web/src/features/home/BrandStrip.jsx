import { useState } from 'react';
import Container from '../../shared/ui/Container.jsx';
import Icon from '../../shared/ui/Icon.jsx';
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
 * pantalla). Se pausa con el cursor, con el foco o con el botón, y no se mueve si el sistema
 * pide reducir las animaciones: en ese caso las marcas se acomodan en filas.
 */
export default function BrandStrip() {
  const [paused, setPaused] = useState(false);

  return (
    <section
      aria-label="Marcas disponibles"
      className="w-full bg-surface-container-low py-space-md"
    >
      <Container className="space-y-space-xs">
        <div className="group overflow-hidden text-on-surface-variant [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] hover:[&_.brand-track]:[animation-play-state:paused] focus-within:[&_.brand-track]:[animation-play-state:paused] motion-reduce:[mask-image:none]">
          <div
            className={`brand-track flex w-max animate-brand-scroll motion-reduce:w-full motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center ${
              paused ? '[animation-play-state:paused]' : ''
            }`}
          >
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

        <div className="flex flex-col items-center justify-between gap-space-xs sm:flex-row">
          <p className="text-center text-body-sm text-outline sm:text-left">
            Marcas de fabricantes presentes en el catálogo. No indican respaldo ni alianza.
          </p>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface motion-reduce:hidden"
          >
            <Icon name={paused ? 'play_arrow' : 'pause'} className="text-[18px]" />
            {paused ? 'Reanudar el carrusel' : 'Pausar el carrusel'}
          </button>
        </div>
      </Container>
    </section>
  );
}
