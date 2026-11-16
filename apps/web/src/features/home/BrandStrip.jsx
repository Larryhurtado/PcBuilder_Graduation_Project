import Container from '../../shared/ui/Container.jsx';

const brands = [
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

/** Franja de marcas de la base maestra. En pantallas pequeñas se acomoda en filas, sin desplazamiento. */
export default function BrandStrip() {
  return (
    <section
      aria-label="Marcas disponibles"
      className="w-full bg-surface-container-low py-space-md"
    >
      <Container>
        <ul className="grid grid-cols-3 gap-x-space-md gap-y-space-sm text-center text-label-md uppercase tracking-widest text-on-surface-variant sm:grid-cols-5 lg:flex lg:items-center lg:justify-between lg:gap-space-xl">
          {brands.map((brand, index) => (
            <li
              key={brand}
              className="flex items-center justify-center gap-space-xl lg:justify-start"
            >
              <span className="transition-colors hover:text-on-surface">{brand}</span>
              {index < brands.length - 1 && (
                <span aria-hidden="true" className="hidden text-outline-variant lg:inline">
                  •
                </span>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
