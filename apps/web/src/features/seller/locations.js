/**
 * Ubicaciones que ofrece el formulario de solicitud: cada una fija ciudad, departamento y centro
 * comercial. "Otra ubicación" pide la ciudad y el departamento a mano (distribuidores mayoristas,
 * bodegas o locales fuera de estos centros).
 */
export const LOCATIONS = [
  {
    id: 'bogota-unilago',
    label: 'Bogotá - C.C. Unilago',
    city: 'Bogotá',
    department: 'Bogotá D.C.',
    commercialCenter: 'C.C. Unilago',
  },
  {
    id: 'bogota-alta-tecnologia',
    label: 'Bogotá - C.C. Alta Tecnología',
    city: 'Bogotá',
    department: 'Bogotá D.C.',
    commercialCenter: 'C.C. Alta Tecnología',
  },
  {
    id: 'medellin-monterrey',
    label: 'Medellín - C.C. Monterrey',
    city: 'Medellín',
    department: 'Antioquia',
    commercialCenter: 'C.C. Monterrey',
  },
  {
    id: 'cali-pasarela',
    label: 'Cali - C.C. Pasarela',
    city: 'Cali',
    department: 'Valle del Cauca',
    commercialCenter: 'C.C. Pasarela',
  },
  {
    id: 'barranquilla-sector-informatico',
    label: 'Barranquilla - Sector informático',
    city: 'Barranquilla',
    department: 'Atlántico',
    commercialCenter: 'Sector informático',
  },
];

export const OTHER_LOCATION = 'other';
export const OTHER_LOCATION_LABEL = 'Otra ubicación (distribuidor mayorista o bodega nacional)';

/**
 * Datos de ubicación para PATCH /seller/store a partir de lo elegido en el formulario.
 * @param {{ location: string, otherCity?: string, otherDepartment?: string }} values
 * @returns {{ city: string, department: string, commercialCenter: string | null }}
 */
export function resolveLocation({ location, otherCity, otherDepartment }) {
  if (location === OTHER_LOCATION) {
    return {
      city: (otherCity ?? '').trim(),
      department: (otherDepartment ?? '').trim(),
      commercialCenter: null,
    };
  }
  const found = LOCATIONS.find((item) => item.id === location);
  return {
    city: found.city,
    department: found.department,
    commercialCenter: found.commercialCenter,
  };
}
