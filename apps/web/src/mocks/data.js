// Datos simulados para desarrollo y pruebas. Reproducen la demostración del backend: las mismas
// tiendas, piezas (BuildCores OpenDB, CC BY-NC-SA 4.0) y precios de db/004_seed_demo.sql, con las
// especificaciones de packages/compat-engine/src/fixtures.js. Cumplen los esquemas de @hw/contracts.

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

const SOCKETS = [
  'AM4',
  'AM5',
  'LGA 1150',
  'LGA 1151',
  'LGA 1155',
  'LGA 1156',
  'LGA 1200',
  'LGA 1700',
  'LGA 1851',
];

// Piezas del catálogo. `key` solo sirve para armar las ofertas de abajo.
const catalog = {
  ryzen5_7600: [
    'cpu',
    'AMD',
    '7600',
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
  ],
  ryzen5_5600: [
    'cpu',
    'AMD',
    '5600',
    'AMD Ryzen 5 5600',
    {
      socket: 'AM4',
      tdpW: 65,
      cores: 6,
      threads: 12,
      baseClockGhz: 3.5,
      boostClockGhz: 4.4,
      memoryTypes: ['DDR4'],
      hasIntegratedGraphics: true,
    },
  ],
  ryzen7_7800x3d: [
    'cpu',
    'AMD',
    '7800X3D',
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
  ],
  i5_12400f: [
    'cpu',
    'Intel',
    '12400F',
    'Intel Core i5 12400F',
    {
      socket: 'LGA 1700',
      tdpW: 65,
      cores: 6,
      threads: 12,
      baseClockGhz: 2.5,
      boostClockGhz: 4.4,
      memoryTypes: ['DDR5', 'DDR4'],
      hasIntegratedGraphics: true,
    },
  ],

  b650mP: [
    'motherboard',
    'MSI',
    'B650M-P',
    'MSI PRO B650M-P',
    {
      socket: 'AM5',
      formFactor: 'Micro ATX',
      chipset: 'AMD B650',
      ramType: 'DDR5',
      ramSlots: 4,
      ramMaxGb: 256,
      m2Slots: 2,
    },
  ],
  b650Plus: [
    'motherboard',
    'MSI',
    'B650 PLUS WIFI',
    'MSI B650 GAMING PLUS WIFI DDR5 ATX',
    {
      socket: 'AM5',
      formFactor: 'ATX',
      chipset: 'AMD B650',
      ramType: 'DDR5',
      ramSlots: 4,
      ramMaxGb: 256,
      m2Slots: 2,
    },
  ],
  b550: [
    'motherboard',
    'MSI',
    'B550-A PRO (CEC)',
    'MSI B550-A PRO (CEC)',
    {
      socket: 'AM4',
      formFactor: 'ATX',
      chipset: 'AMD B550',
      ramType: 'DDR4',
      ramSlots: 4,
      ramMaxGb: 128,
      m2Slots: 2,
    },
  ],
  b760m: [
    'motherboard',
    'ASUS',
    'B760M-AYW WIFI D4',
    'ASUS B760M-AYW WIFI D4 LGA1700 DDR4 Micro-ATX',
    {
      socket: 'LGA 1700',
      formFactor: 'Micro ATX',
      chipset: 'Intel B760',
      ramType: 'DDR4',
      ramSlots: 2,
      ramMaxGb: 64,
      m2Slots: 2,
    },
  ],

  ddr5_6200: [
    'ram',
    'Corsair',
    'Vengeance',
    'Corsair Vengeance Black DDR5-6200 CL32 32GB (2x16GB)',
    {
      ramType: 'DDR5',
      speedMhz: 6200,
      modulesQty: 2,
      capacityGb: 32,
      formFactor: 'DIMM',
      casLatency: 32,
    },
  ],
  ddr5_5600: [
    'ram',
    'G.SKILL',
    'Trident Z5',
    'G.Skill Trident Z5 Metallic Silver DDR5-5600 CL36 32GB (2x16GB)',
    {
      ramType: 'DDR5',
      speedMhz: 5600,
      modulesQty: 2,
      capacityGb: 32,
      formFactor: 'DIMM',
      casLatency: 36,
    },
  ],
  ddr4_2666: [
    'ram',
    'Kingston',
    '2666 CL16',
    'Kingston HyperX Fury Black DDR4-2666 CL16 16GB (2x8GB)',
    {
      ramType: 'DDR4',
      speedMhz: 2666,
      modulesQty: 2,
      capacityGb: 16,
      formFactor: 'DIMM',
      casLatency: 16,
    },
  ],

  rtx4060ti: [
    'gpu',
    'MSI',
    'Gaming X Trio',
    'MSI GeForce RTX 4060 Ti GAMING X TRIO 8G GDDR6',
    {
      tdpW: 160,
      lengthMm: 338,
      slotWidth: 2.6,
      interface: 'PCIe 4.0 x8',
      memoryGb: 8,
      powerConnectors: { pcie_6_pin: 0, pcie_8_pin: 1, pcie_12VHPWR: 0, pcie_12V_2x6: 0 },
    },
  ],
  rtx4070super: [
    'gpu',
    'ASUS',
    'Dual',
    'Asus DUAL GeForce RTX 4070 SUPER 12GB GDDR6X White',
    {
      tdpW: 220,
      lengthMm: 267,
      slotWidth: 2.5,
      interface: 'PCIe 4.0 x16',
      memoryGb: 12,
      powerConnectors: { pcie_6_pin: 0, pcie_8_pin: 0, pcie_12VHPWR: 1, pcie_12V_2x6: 0 },
    },
  ],

  rm750: [
    'psu',
    'Corsair',
    '750W Gold',
    'Corsair RM750 750W 80+ Gold Certified Fully Modular ATX',
    {
      wattageW: 750,
      formFactor: 'ATX',
      efficiencyRating: '80+ Gold',
      modular: 'Full',
      connectors: { sata: 14, atx_24_pin: 1 },
    },
  ],
  mwe750: [
    'psu',
    'Cooler Master',
    '750W Gold',
    'Cooler Master MWE Gold V2 White ATX3.0 750W Fully Modular 80+ Gold Certified',
    {
      wattageW: 750,
      formFactor: 'ATX',
      efficiencyRating: '80+ Gold',
      modular: 'Full',
      connectors: { sata: 12, atx_24_pin: 1 },
    },
  ],

  case4000d: [
    'case',
    'Corsair',
    'AIRFLOW w/750 W Power Supply',
    'Corsair 4000D Airflow ATX Mid Tower Black Tempered Glass Side Panel, w/750 W Power Supply',
    {
      formFactor: 'ATX Mid Tower',
      supportedMbFormFactors: ['ATX', 'Micro ATX', 'Mini-ITX', 'EATX'],
      supportedPsuFormFactors: ['ATX'],
      maxGpuLengthMm: 360,
      maxCoolerHeightMm: 170,
    },
  ],
  nr200p: [
    'case',
    'Cooler Master',
    'MasterBox NR200P',
    'Cooler Master MasterBox NR200P Mini-ITX Desktop Purple with Steel Side Panel',
    {
      formFactor: 'Mini ITX Tower',
      supportedMbFormFactors: ['Mini-ITX'],
      supportedPsuFormFactors: ['SFX', 'SFX-L'],
      maxGpuLengthMm: 330,
      maxCoolerHeightMm: 153,
    },
  ],
  // Solo existe en los simulados: caja con datos incompletos para ver el estado "No verificable".
  h510: [
    'case',
    'NZXT',
    'H510 Flow',
    'NZXT H510 Flow ATX Mid Tower',
    {
      formFactor: 'ATX Mid Tower',
      supportedMbFormFactors: ['ATX', 'Micro ATX', 'Mini-ITX'],
      supportedPsuFormFactors: null,
      maxGpuLengthMm: 381,
      maxCoolerHeightMm: null,
    },
  ],

  ak400: [
    'cooler',
    'DeepCool',
    'Deepcool AK400 Air 155mm Black / Silver',
    'Deepcool AK400 Air 155mm Black / Silver',
    { heightMm: 155, waterCooled: false, radiatorMm: null, sockets: SOCKETS },
  ],
  peerless: [
    'cooler',
    'Thermalright',
    '140 SE',
    'Thermalright Peerless Assassin 140 SE Black/Silver',
    { heightMm: 155, waterCooled: false, radiatorMm: null, sockets: SOCKETS },
  ],

  nv3: [
    'storage',
    'Kingston Technology',
    '1TB',
    'Kingston NV3 PCIe 4.0 NVMe SSD 2280 1TB',
    { storageType: 'SSD', interface: 'NVMe', capacityGb: 1000, formFactor: 'M.2-2280' },
  ],
};

const componentIds = Object.fromEntries(
  Object.keys(catalog).map((key, index) => [
    key,
    `c0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  ]),
);

// [tienda, pieza, precio COP, condición, meses de garantía], de la más reciente a la más antigua.
const listings = [
  [tecnoPasarela, 'ryzen5_7600', 849000, 'new', 12],
  [unilago, 'rtx4070super', 3050000, 'new', 24],
  [unilago, 'ryzen7_7800x3d', 1699000, 'new', 12],
  [unilago, 'nv3', 299000, 'new', 36],
  [tecnoPasarela, 'rtx4060ti', 1950000, 'new', 24],
  [tecnoPasarela, 'rm750', 489000, 'new', 60],
  [tecnoPasarela, 'b650mP', 589000, 'new', 12],
  [tecnoPasarela, 'ddr5_6200', 469000, 'new', 12],
  [unilago, 'ryzen5_7600', 879000, 'new', 12],
  [unilago, 'b650Plus', 749000, 'new', 12],
  [unilago, 'ddr5_5600', 499000, 'new', 12],
  [unilago, 'mwe750', 519000, 'new', 60],
  [tecnoPasarela, 'case4000d', 429000, 'new', 12],
  [unilago, 'nr200p', 589000, 'new', 12],
  [tecnoPasarela, 'ak400', 99000, 'new', 6],
  [unilago, 'peerless', 139000, 'new', 12],
  [unilago, 'i5_12400f', 639000, 'new', 12],
  [unilago, 'b760m', 559000, 'new', 12],
  [tecnoPasarela, 'ryzen5_5600', 529000, 'new', 12],
  [tecnoPasarela, 'b550', 479000, 'new', 12],
  [tecnoPasarela, 'ddr4_2666', 189000, 'used', 3],
  [tecnoPasarela, 'h510', 349000, 'new', 12],
];

const newest = Date.UTC(2026, 10, 15, 12, 0, 0);

/** Ofertas públicas con sus especificaciones, de la más reciente a la más antigua. */
export const offers = listings.map(([store, key, priceCop, condition, warrantyMonths], index) => {
  const [category, brand, model, displayName, specs] = catalog[key];
  return {
    offerId: `a0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    priceCop,
    condition,
    warrantyMonths,
    publishedAt: new Date(newest - index * 3_600_000).toISOString(),
    coverImageUrl: null,
    component: { id: componentIds[key], category, brand, model, displayName, specs },
    store: storeSummary(store),
  };
});

/** Busca una oferta del catálogo simulado por el nombre de su componente. */
export function findOffer(displayNamePart, storeName) {
  const offer = offers.find(
    (item) =>
      item.component.displayName.includes(displayNamePart) &&
      (!storeName || item.store.name === storeName),
  );
  if (!offer) throw new Error(`No hay oferta simulada para "${displayNamePart}"`);
  return offer;
}
