import { getErrorMessage } from '../../shared/api/client.js';
import Container from '../../shared/ui/Container.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import SectionHeader from '../../shared/ui/SectionHeader.jsx';
import StoreCard, { StoreCardSkeleton } from '../../shared/ui/StoreCard.jsx';
import { useStores } from '../stores/queries.js';

const grid = 'grid grid-cols-1 gap-space-lg lg:grid-cols-3';

/** Comercios verificados. La verificación confirma que el negocio existe; no garantiza sus ofertas. */
export default function VerifiedStores() {
  const { data, isPending, isError, error, refetch } = useStores({ limit: 3 });

  return (
    <Container as="section" aria-labelledby="comercios-title" className="pb-space-2xl">
      <SectionHeader
        id="comercios-title"
        title="Comercios Verificados"
        description="Tiendas físicas cuya existencia como negocio fue verificada. La verificación no garantiza el cumplimiento de sus ofertas."
        action={{ to: '/tiendas', label: 'Directorio completo de tiendas' }}
      />

      {isPending && (
        <div className={grid} role="status" aria-label="Cargando comercios">
          {Array.from({ length: 3 }, (_, index) => (
            <StoreCardSkeleton key={index} />
          ))}
        </div>
      )}

      {isError && <ErrorNotice message={getErrorMessage(error)} onRetry={() => refetch()} />}

      {data && data.items.length === 0 && (
        <p className="rounded-2xl bg-surface-container p-6 text-body-md text-on-surface-variant">
          Aún no hay comercios verificados para mostrar.
        </p>
      )}

      {data && data.items.length > 0 && (
        <ul className={grid}>
          {data.items.map((store) => (
            <li key={store.id} className="flex list-none">
              <div className="flex w-full flex-col [&>article]:flex-1">
                <StoreCard store={store} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
