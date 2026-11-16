import { Link } from 'react-router';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import Container from '../../shared/ui/Container.jsx';
import SectionHeader from '../../shared/ui/SectionHeader.jsx';

/** Las 8 categorías del MVP, en el orden del diseño, con la etiqueta técnica de cada una. */
export const homeCategories = [
  { id: 'cpu', label: 'Procesadores', note: 'CPU' },
  { id: 'gpu', label: 'Tarjetas gráficas', note: 'GPU' },
  { id: 'motherboard', label: 'Placas base', note: 'Motherboard' },
  { id: 'ram', label: 'Memoria RAM', note: 'DDR4 / DDR5' },
  { id: 'storage', label: 'Almacén', note: 'NVMe / SSD' },
  { id: 'psu', label: 'Fuentes', note: 'PSU' },
  { id: 'cooler', label: 'Refrigeración', note: 'AIO / Air' },
  { id: 'case', label: 'Gabinetes', note: 'Case' },
];

/** Atajos al catálogo por categoría. */
export default function CategoriesSection() {
  return (
    <Container as="section" aria-labelledby="categorias-title" className="py-space-2xl">
      <SectionHeader
        id="categorias-title"
        title="Explora por Componentes"
        description="Filtra el catálogo según la pieza que necesitas validar o cotizar en comercios colombianos."
        action={{ to: '/catalogo', label: 'Ver todas las categorías', icon: 'chevron_right' }}
      />
      <ul className="grid grid-cols-2 gap-space-md sm:grid-cols-4 lg:grid-cols-8">
        {homeCategories.map(({ id, label, note }) => (
          <li key={id} className="list-none">
            <Link
              to={`/catalogo?category=${id}`}
              className="group flex aspect-square h-full w-full flex-col items-center justify-center rounded-2xl bg-surface-container p-space-md text-center transition-colors hover:bg-surface-container-high motion-reduce:transition-none"
            >
              <span className="mb-space-sm flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-primary transition-colors group-hover:bg-primary-container group-hover:text-on-primary-container motion-reduce:transition-none">
                <CategoryIcon category={id} />
              </span>
              <span className="text-label-md text-on-surface transition-colors group-hover:text-primary">
                {label}
              </span>
              <span className="tnum mt-0.5 text-code-metric text-outline">{note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
