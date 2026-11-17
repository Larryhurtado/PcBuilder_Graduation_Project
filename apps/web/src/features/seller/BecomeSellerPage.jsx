import { useEffect } from 'react';
import { Link } from 'react-router';
import { PLATFORM_NAME } from '../../shared/config.js';
import Container from '../../shared/ui/Container.jsx';
import ApplicationForm from './ApplicationForm.jsx';
import { Advantages, FinalCta, Hero, Proof, Requirements, Steps } from './sections.jsx';

/** Ser vendedor (/vender): captación de comercios y solicitud para convertirse en vendedor. */
export default function BecomeSellerPage() {
  useEffect(() => {
    document.title = `Ser vendedor · ${PLATFORM_NAME}`;
  }, []);

  return (
    <>
      <Container className="pt-space-lg">
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
              Ser vendedor y alianzas comerciales
            </li>
          </ol>
        </nav>
      </Container>
      <Hero />
      <Advantages />
      <Requirements />
      <Steps />
      <ApplicationForm />
      <Proof />
      <FinalCta />
    </>
  );
}
