// Datos simulados para desarrollo y pruebas. Siguen la demostración del backend (tiendas, precios
// y piezas de docs/contexto-frontend.md, sección 13). Las especificaciones son ilustrativas: los
// valores reales llegan de la Base Maestra. Deben cumplir los esquemas de @hw/contracts.

export const stores = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    legalName: 'TecnoPasarela Cali S.A.S.',
    tradeName: 'TecnoPasarela Cali',
    name: 'TecnoPasarela Cali',
    description: 'Ensamble a medida, componentes de gama alta y estaciones de trabajo.',
    city: 'Cali',
    department: 'Valle del Cauca',
    commercialCenter: 'C.C. Pasarela',
    address: 'Local 214, C.C. Pasarela',
    whatsappE164: '+573000000001',
    isVerified: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    legalName: 'Unilago Gaming S.A.S.',
    tradeName: 'Unilago Gaming',
    name: 'Unilago Gaming',
    description:
      'Procesadores de última generación, refrigeración líquida y memorias de alto rendimiento.',
    city: 'Bogotá',
    department: 'Bogotá D.C.',
    commercialCenter: 'C.C. Unilago',
    address: 'Local 305, C.C. Unilago',
    whatsappE164: '+573000000002',
    isVerified: true,
  },
];

const [tecnoPasarela, unilago] = stores;

const storeSummary = ({ id, name, city, department, commercialCenter, whatsappE164 }) => ({
  id,
  name,
  city,
  department,
  commercialCenter,
  whatsappE164,
});

const component = (id, category, brand, model, displayName, specs) => ({
  id,
  category,
  brand,
  model,
  displayName,
  specs,
});

export const offers = [
  {
    offerId: 'a0000001-0000-4000-8000-000000000001',
    priceCop: 849000,
    condition: 'new',
    warrantyMonths: 12,
    publishedAt: '2026-11-14T15:04:05Z',
    coverImageUrl: null,
    component: component(
      'c0000001-0000-4000-8000-000000000001',
      'cpu',
      'AMD',
      'Ryzen 5 7600',
      'AMD Ryzen 5 7600',
      {
        socket: 'AM5',
        tdpW: 65,
        cores: 6,
        threads: 12,
        baseClockGhz: 3.8,
        boostClockGhz: 5.1,
        memoryTypes: ['DDR5'],
        hasIntegratedGraphics: true,
      },
    ),
    store: storeSummary(tecnoPasarela),
  },
  {
    offerId: 'a0000001-0000-4000-8000-000000000002',
    priceCop: 3050000,
    condition: 'new',
    warrantyMonths: 12,
    publishedAt: '2026-11-13T10:20:00Z',
    coverImageUrl: null,
    component: component(
      'c0000001-0000-4000-8000-000000000002',
      'gpu',
      'NVIDIA',
      'GeForce RTX 4070 SUPER',
      'NVIDIA GeForce RTX 4070 SUPER 12GB',
      {
        tdpW: 220,
        lengthMm: 304,
        slotWidth: 2,
        interface: 'PCIe 4.0',
        memoryGb: 12,
        powerConnectors: { pcie_8_pin: 1 },
      },
    ),
    store: storeSummary(unilago),
  },
  {
    offerId: 'a0000001-0000-4000-8000-000000000003',
    priceCop: 189000,
    condition: 'used',
    warrantyMonths: 3,
    publishedAt: '2026-11-12T18:45:00Z',
    coverImageUrl: null,
    component: component(
      'c0000001-0000-4000-8000-000000000003',
      'ram',
      'Corsair',
      'Vengeance DDR4 16GB',
      'Corsair Vengeance 16GB DDR4',
      {
        ramType: 'DDR4',
        speedMhz: 3200,
        modulesQty: 2,
        capacityGb: 16,
        formFactor: 'DIMM',
        casLatency: 16,
      },
    ),
    store: storeSummary(tecnoPasarela),
  },
  {
    offerId: 'a0000001-0000-4000-8000-000000000004',
    priceCop: 1699000,
    condition: 'new',
    warrantyMonths: 12,
    publishedAt: '2026-11-11T09:00:00Z',
    coverImageUrl: null,
    component: component(
      'c0000001-0000-4000-8000-000000000004',
      'cpu',
      'AMD',
      'Ryzen 7 7800X3D',
      'AMD Ryzen 7 7800X3D',
      {
        socket: 'AM5',
        tdpW: 120,
        cores: 8,
        threads: 16,
        baseClockGhz: 4.2,
        boostClockGhz: 5,
        memoryTypes: ['DDR5'],
        hasIntegratedGraphics: true,
      },
    ),
    store: storeSummary(unilago),
  },
];
