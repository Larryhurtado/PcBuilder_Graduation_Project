import { useEffect } from 'react';
import ButtonLink from '../shared/ui/ButtonLink.jsx';
import Container from '../shared/ui/Container.jsx';

/** Pantalla pendiente: mantiene la ruta navegable (barra superior y pie) hasta que se construya. */
export function ComingSoonPage({ title }) {
  useEffect(() => {
    document.title = `${title} · PcBuilder`;
  }, [title]);

  return (
    <Container className="flex min-h-[50vh] flex-col items-start justify-center gap-space-md py-space-2xl">
      <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">{title}</h1>
      <p className="max-w-xl text-body-lg text-on-surface-variant">
        Esta pantalla todavía está en construcción.
      </p>
      <ButtonLink to="/" variant="secondary">
        Volver al inicio
      </ButtonLink>
    </Container>
  );
}

/** Ruta inexistente. */
export function NotFoundPage() {
  return (
    <Container className="flex min-h-[50vh] flex-col items-start justify-center gap-space-md py-space-2xl">
      <p className="tnum text-code-metric text-outline">Error 404</p>
      <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
        No encontramos esa página
      </h1>
      <p className="max-w-xl text-body-lg text-on-surface-variant">
        El enlace puede estar roto o la página ya no existe.
      </p>
      <ButtonLink to="/" variant="primary">
        Ir al inicio
      </ButtonLink>
    </Container>
  );
}
