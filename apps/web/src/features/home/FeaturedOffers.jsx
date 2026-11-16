import { getErrorMessage } from '../../shared/api/client.js';
import Container from '../../shared/ui/Container.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import OfferCard, { OfferCardSkeleton } from '../../shared/ui/OfferCard.jsx';
import SectionHeader from '../../shared/ui/SectionHeader.jsx';
import { useFeaturedOffers } from './queries.js';

const grid = 'grid grid-cols-1 gap-space-lg sm:grid-cols-2 lg:grid-cols-4';

/** HU-02: ofertas recientes de comercios verificados. */
export default function FeaturedOffers() {
  const { data, isPending, isError, error, refetch } = useFeaturedOffers();

  return (
    <Container as="section" aria-labelledby="ofertas-title" className="pb-space-2xl">
      <SectionHeader
        id="ofertas-title"
        title="Ofertas Destacadas en Colombia"
        description="Precios publicados por cada tienda en pesos colombianos. Confirma la disponibilidad por WhatsApp antes de ir."
        action={{ to: '/catalogo', label: 'Ver todas las ofertas en Catálogo' }}
      />

      {isPending && (
        <div className={grid} role="status" aria-label="Cargando ofertas">
          {Array.from({ length: 4 }, (_, index) => (
            <OfferCardSkeleton key={index} />
          ))}
        </div>
      )}

      {isError && <ErrorNotice message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {data && data.items.length === 0 && (
        <p className="rounded-2xl bg-surface-container p-6 text-body-md text-on-surface-variant">
          Todavía no hay ofertas publicadas. Vuelve pronto o explora el catálogo.
        </p>
      )}

      {data && data.items.length > 0 && (
        <ul className={grid}>
          {data.items.map((offer) => (
            <li key={offer.offerId} className="flex list-none">
              <div className="flex w-full flex-col [&>article]:flex-1">
                <OfferCard offer={offer} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
