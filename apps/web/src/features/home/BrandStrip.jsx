import { useEffect, useRef, useState } from 'react';
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

/** Aviso legal de la franja: se ve al dejar el cursor sobre ella y lo leen los lectores de pantalla. */
export const BRAND_NOTICE =
  'Marcas de fabricantes presentes en el catálogo. No indican respaldo ni alianza.';

/** Milisegundos con el cursor quieto sobre la franja antes de mostrar el aviso. */
const HOVER_DELAY = 1500;
/** Milisegundos que el aviso queda visible tras tocar la franja en una pantalla táctil. */
const TOUCH_DURATION = 5000;

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
 * pantalla). Se pausa al pasar el cursor, y con movimiento reducido no se mueve: las marcas se
 * acomodan en filas.
 *
 * El aviso de que las marcas no indican respaldo ni alianza no ocupa lugar: aparece como una
 * tarjeta flotante al dejar el cursor quieto sobre la franja (o al tocarla en el celular), y los
 * lectores de pantalla lo reciben como descripción de la sección.
 * @param {{ hoverDelay?: number }} props `hoverDelay` cambia la espera del cursor (para pruebas)
 */
export default function BrandStrip({ hoverDelay = HOVER_DELAY }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const clear = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);

  const onPointerEnter = (event) => {
    if (event.pointerType !== 'mouse') return;
    clear();
    timer.current = setTimeout(() => setVisible(true), hoverDelay);
  };
  const onPointerLeave = (event) => {
    if (event.pointerType !== 'mouse') return;
    clear();
    setVisible(false);
  };
  // En pantallas táctiles no hay cursor: un toque muestra el aviso un rato
  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse') return;
    clear();
    setVisible((value) => !value);
    timer.current = setTimeout(() => setVisible(false), TOUCH_DURATION);
  };

  return (
    <section
      aria-label="Marcas disponibles"
      aria-describedby="marcas-aviso"
      className="relative z-10 w-full bg-surface-container-low py-3"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
    >
      <Container>
        <div className="group overflow-hidden text-on-surface-variant [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] hover:[&_.brand-track]:[animation-play-state:paused] motion-reduce:[mask-image:none]">
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

      {/* Para lectores de pantalla: la descripción de la sección */}
      <p id="marcas-aviso" className="sr-only">
        {BRAND_NOTICE}
      </p>

      {/* Tarjeta flotante: solo visual, no recibe el cursor ni el foco */}
      <div
        aria-hidden="true"
        data-brand-notice
        data-visible={visible}
        className={`pointer-events-none absolute left-1/2 top-full mt-space-sm flex w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-space-sm rounded-2xl border border-outline-variant bg-surface-container-high px-space-md py-space-sm shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-200 ease-out motion-reduce:transition-none ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container/30 text-primary">
          <Icon name="info" className="text-[18px]" />
        </span>
        <p className="text-body-sm text-on-surface">{BRAND_NOTICE}</p>
      </div>
    </section>
  );
}
