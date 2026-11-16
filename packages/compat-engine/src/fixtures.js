// Especificaciones reales de la semilla de la base de datos (BuildCores OpenDB, CC BY-NC-SA 4.0),
// tal como las entrega GET /components/{id}. Solo se usan en las pruebas.

const AM_SOCKETS = [
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

export const cpuRyzen5_7600 = {
  socket: 'AM5',
  tdpW: 65,
  cores: 6,
  threads: 12,
  baseClockGhz: 3.8,
  boostClockGhz: 5.1,
  memoryTypes: ['DDR5'],
  hasIntegratedGraphics: true,
};
export const cpuRyzen5_5600 = {
  socket: 'AM4',
  tdpW: 65,
  cores: 6,
  threads: 12,
  baseClockGhz: 3.5,
  boostClockGhz: 4.4,
  memoryTypes: ['DDR4'],
  hasIntegratedGraphics: true,
};
export const cpuRyzen7_7800x3d = {
  socket: 'AM5',
  tdpW: 120,
  cores: 8,
  threads: 16,
  baseClockGhz: 4.2,
  boostClockGhz: 5,
  memoryTypes: ['DDR5'],
  hasIntegratedGraphics: true,
};
export const cpuI5_12400f = {
  socket: 'LGA 1700',
  tdpW: 65,
  cores: 6,
  threads: 12,
  baseClockGhz: 2.5,
  boostClockGhz: 4.4,
  memoryTypes: ['DDR5', 'DDR4'],
  hasIntegratedGraphics: true,
};

export const mbB650mPro = {
  socket: 'AM5',
  formFactor: 'Micro ATX',
  chipset: 'AMD B650',
  ramType: 'DDR5',
  ramSlots: 4,
  ramMaxGb: 256,
  m2Slots: 2,
};
export const mbB650Atx = {
  socket: 'AM5',
  formFactor: 'ATX',
  chipset: 'AMD B650',
  ramType: 'DDR5',
  ramSlots: 4,
  ramMaxGb: 256,
  m2Slots: 2,
};
export const mbB550 = {
  socket: 'AM4',
  formFactor: 'ATX',
  chipset: 'AMD B550',
  ramType: 'DDR4',
  ramSlots: 4,
  ramMaxGb: 128,
  m2Slots: 2,
};
export const mbH610iMini = {
  socket: 'LGA 1700',
  formFactor: 'Mini-ITX',
  chipset: 'Intel H610',
  ramType: 'DDR4',
  ramSlots: 2,
  ramMaxGb: 64,
  m2Slots: 3,
};
export const mbB760mDdr4 = {
  socket: 'LGA 1700',
  formFactor: 'Micro ATX',
  chipset: 'Intel B760',
  ramType: 'DDR4',
  ramSlots: 2,
  ramMaxGb: 64,
  m2Slots: 2,
};

export const ramDdr5_32 = {
  ramType: 'DDR5',
  speedMhz: 6200,
  modulesQty: 2,
  capacityGb: 32,
  formFactor: 'DIMM',
  casLatency: 32,
};
export const ramDdr4_16 = {
  ramType: 'DDR4',
  speedMhz: 2666,
  modulesQty: 2,
  capacityGb: 16,
  formFactor: 'DIMM',
  casLatency: 16,
};
export const ramDdr4_64 = {
  ramType: 'DDR4',
  speedMhz: 4000,
  modulesQty: 2,
  capacityGb: 64,
  formFactor: 'DIMM',
  casLatency: 18,
};

export const gpuRtx4060Ti = {
  tdpW: 160,
  lengthMm: 338,
  slotWidth: 2.6,
  interface: 'PCIe 4.0 x8',
  memoryGb: 8,
  powerConnectors: { pcie_6_pin: 0, pcie_8_pin: 1, pcie_12VHPWR: 0, pcie_12V_2x6: 0 },
};
export const gpuRtx4070Super = {
  tdpW: 220,
  lengthMm: 267,
  slotWidth: 2.5,
  interface: 'PCIe 4.0 x16',
  memoryGb: 12,
  powerConnectors: { pcie_6_pin: 0, pcie_8_pin: 0, pcie_12VHPWR: 1, pcie_12V_2x6: 0 },
};
export const gpuRx7600 = {
  tdpW: 165,
  lengthMm: 241,
  slotWidth: 2,
  interface: 'PCIe 4.0 x8',
  memoryGb: 8,
  powerConnectors: { pcie_6_pin: 0, pcie_8_pin: 1, pcie_12VHPWR: 0, pcie_12V_2x6: 0 },
};

export const psuRm750 = {
  wattageW: 750,
  formFactor: 'ATX',
  efficiencyRating: '80+ Gold',
  modular: 'Full',
  connectors: { sata: 14, atx_24_pin: 1 },
};
export const psuCv650 = {
  wattageW: 650,
  formFactor: 'ATX',
  efficiencyRating: '80+ Bronze',
  modular: 'Non-Modular',
  connectors: { sata: 10, atx_24_pin: 1 },
};

export const case4000d = {
  formFactor: 'ATX Mid Tower',
  supportedMbFormFactors: ['ATX', 'Micro ATX', 'Mini-ITX', 'EATX'],
  supportedPsuFormFactors: ['ATX'],
  maxGpuLengthMm: 360,
  maxCoolerHeightMm: 170,
};
export const caseNr200p = {
  formFactor: 'Mini ITX Tower',
  supportedMbFormFactors: ['Mini-ITX'],
  supportedPsuFormFactors: ['SFX', 'SFX-L'],
  maxGpuLengthMm: 330,
  maxCoolerHeightMm: 153,
};
/** Caja con datos faltantes: sin altura máxima de disipador ni formatos de fuente (caso CP-05). */
export const caseH510Unknown = {
  formFactor: 'ATX Mid Tower',
  supportedMbFormFactors: ['ATX', 'Micro ATX', 'Mini-ITX'],
  supportedPsuFormFactors: null,
  maxGpuLengthMm: 381,
  maxCoolerHeightMm: null,
};

export const coolerAk400 = {
  heightMm: 155,
  waterCooled: false,
  radiatorMm: null,
  sockets: AM_SOCKETS,
};

export const storageNv3 = {
  storageType: 'SSD',
  interface: 'NVMe',
  capacityGb: 1000,
  formFactor: 'M.2-2280',
};

/** Armado A del Diseño (caso CP-01): todo compatible, 300 W y fuente recomendada de 400 W. */
export const buildA = {
  cpu: cpuRyzen5_7600,
  motherboard: mbB650mPro,
  ram: ramDdr5_32,
  gpu: gpuRtx4060Ti,
  psu: psuRm750,
  pcCase: case4000d,
  cooler: coolerAk400,
  storage: storageNv3,
};

/** Armado B del Diseño: Ryzen 5 5600 (AM4) con placa AM5, RAM DDR4 y caja solo Mini-ITX. */
export const buildB = {
  cpu: cpuRyzen5_5600,
  motherboard: mbB650mPro,
  ram: ramDdr4_16,
  pcCase: caseNr200p,
};
