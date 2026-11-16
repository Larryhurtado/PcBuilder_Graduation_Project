/**
 * Resúmenes legibles de las especificaciones de un componente (objeto plano de @hw/contracts).
 * Un dato `null` (no verificable) simplemente no aparece: nunca se muestra como cero.
 */

const present = (value) => value !== null && value !== undefined && value !== '';

const join = (parts) => parts.filter(present).join(' • ');

const gb = (capacityGb) =>
  capacityGb >= 1000 ? `${Number((capacityGb / 1000).toFixed(1))} TB` : `${capacityGb} GB`;

const lineBuilders = {
  cpu: (s) =>
    join([
      s.socket,
      present(s.baseClockGhz) && present(s.boostClockGhz)
        ? `${s.baseClockGhz}/${s.boostClockGhz} GHz`
        : null,
      present(s.cores) ? `${s.cores} núcleos` : null,
    ]),
  motherboard: (s) => join([s.socket, s.formFactor, s.chipset, s.ramType]),
  ram: (s) =>
    join([
      `${s.ramType}-${s.speedMhz}`,
      s.modulesQty > 0 ? `${s.modulesQty}×${s.capacityGb / s.modulesQty} GB` : null,
      present(s.casLatency) ? `CL${s.casLatency}` : null,
    ]),
  gpu: (s) =>
    join([
      present(s.memoryGb) ? `${s.memoryGb} GB` : null,
      s.interface,
      present(s.lengthMm) ? `${s.lengthMm} mm` : null,
    ]),
  psu: (s) => join([`${s.wattageW} W`, s.efficiencyRating, s.modular]),
  case: (s) =>
    join([s.formFactor, present(s.maxGpuLengthMm) ? `GPU máx. ${s.maxGpuLengthMm} mm` : null]),
  cooler: (s) =>
    join([
      present(s.heightMm) ? `${s.heightMm} mm` : null,
      s.waterCooled === true ? 'Líquida' : s.waterCooled === false ? 'Aire' : null,
      present(s.radiatorMm) ? `Radiador ${s.radiatorMm} mm` : null,
    ]),
  storage: (s) => join([s.storageType, s.interface, gb(s.capacityGb)]),
};

const highlightBuilders = {
  cpu: (s) => `Socket ${s.socket}`,
  motherboard: (s) => join([`Socket ${s.socket}`, s.ramType]),
  ram: (s) => join([s.ramType, `${s.speedMhz} MHz`]),
  gpu: (s) => (present(s.tdpW) ? `${s.tdpW} W de consumo` : ''),
  psu: (s) => `${s.wattageW} W`,
  case: (s) => (Array.isArray(s.supportedMbFormFactors) ? s.supportedMbFormFactors.join(', ') : ''),
  cooler: (s) => (Array.isArray(s.sockets) ? s.sockets.slice(0, 3).join(', ') : ''),
  storage: (s) => s.interface,
};

/**
 * Línea técnica bajo el nombre del componente (por ejemplo "AM5 • 4.2/5.0 GHz • 8 núcleos").
 * @param {string} category
 * @param {Record<string, any> | null | undefined} specs
 */
export function specLine(category, specs) {
  if (!specs || !lineBuilders[category]) return '';
  return lineBuilders[category](specs);
}

/**
 * Dato clave de la categoría para la etiqueta de la tarjeta (por ejemplo "Socket AM5").
 * @param {string} category
 * @param {Record<string, any> | null | undefined} specs
 */
export function specHighlight(category, specs) {
  if (!specs || !highlightBuilders[category]) return '';
  return highlightBuilders[category](specs);
}

const watts = (value) => (present(value) ? `TDP ${value} W` : null);
const mm = (label, value) => (present(value) ? `${label} ${value} mm` : null);

const pillBuilders = {
  cpu: (s) => [
    watts(s.tdpW),
    Array.isArray(s.memoryTypes) ? s.memoryTypes.join(' / ') : null,
    s.hasIntegratedGraphics === true
      ? 'Gráficos integrados'
      : s.hasIntegratedGraphics === false
        ? 'Requiere GPU'
        : null,
  ],
  motherboard: (s) => [s.formFactor, s.ramType, present(s.m2Slots) ? `${s.m2Slots} M.2` : null],
  ram: (s) => [
    present(s.capacityGb) ? `${s.capacityGb} GB` : null,
    present(s.speedMhz) ? `${s.speedMhz} MHz` : null,
    present(s.casLatency) ? `CL${s.casLatency}` : null,
  ],
  gpu: (s) => [
    watts(s.tdpW),
    mm('Longitud', s.lengthMm),
    present(s.memoryGb) ? `${s.memoryGb} GB` : null,
  ],
  psu: (s) => [s.efficiencyRating, s.modular, s.formFactor],
  case: (s) => [
    s.formFactor,
    mm('GPU máx.', s.maxGpuLengthMm),
    mm('Disipador máx.', s.maxCoolerHeightMm),
  ],
  cooler: (s) => [
    mm('Altura', s.heightMm),
    s.waterCooled === true ? 'Líquida' : s.waterCooled === false ? 'Aire' : null,
    present(s.radiatorMm) ? `Radiador ${s.radiatorMm} mm` : null,
  ],
  storage: (s) => [s.storageType, s.interface, present(s.capacityGb) ? gb(s.capacityGb) : null],
};

/**
 * Hasta tres etiquetas cortas con los datos técnicos más útiles de la pieza (TDP, memoria,
 * longitud…). Los datos desconocidos (`null`) no aparecen.
 * @param {string} category
 * @param {Record<string, any> | null | undefined} specs
 * @returns {string[]}
 */
export function specPills(category, specs) {
  if (!specs || !pillBuilders[category]) return [];
  return pillBuilders[category](specs).filter(present).slice(0, 3);
}

const list = (value) => (Array.isArray(value) && value.length > 0 ? value.join(', ') : null);
const yesNo = (value) => (value === true ? 'Sí' : value === false ? 'No' : null);
const amount = (value, unit) => (present(value) ? `${value} ${unit}` : null);

/** Filas de la tabla de especificaciones: [clave, etiqueta, valor]. Un valor `null` es un dato faltante. */
const rowBuilders = {
  cpu: (s) => [
    ['socket', 'Socket', s.socket],
    [
      'cores',
      'Núcleos / hilos',
      present(s.cores) || present(s.threads)
        ? [amount(s.cores, 'núcleos'), amount(s.threads, 'hilos')].filter(present).join(' / ')
        : null,
    ],
    [
      'clock',
      'Frecuencia base / turbo',
      present(s.baseClockGhz) && present(s.boostClockGhz)
        ? `${s.baseClockGhz} GHz / ${s.boostClockGhz} GHz`
        : present(s.baseClockGhz)
          ? `${s.baseClockGhz} GHz`
          : null,
    ],
    ['tdp', 'TDP', amount(s.tdpW, 'W')],
    ['memory', 'Memoria compatible', list(s.memoryTypes)],
    ['igpu', 'Gráficos integrados', yesNo(s.hasIntegratedGraphics)],
  ],
  motherboard: (s) => [
    ['socket', 'Socket', s.socket],
    ['formFactor', 'Factor de forma', s.formFactor],
    ['chipset', 'Chipset', s.chipset],
    ['ramType', 'Tipo de memoria', s.ramType],
    ['ramSlots', 'Ranuras de memoria', present(s.ramSlots) ? String(s.ramSlots) : null],
    ['ramMax', 'Memoria máxima', amount(s.ramMaxGb, 'GB')],
    ['m2', 'Ranuras M.2', present(s.m2Slots) ? String(s.m2Slots) : null],
  ],
  ram: (s) => [
    ['ramType', 'Tipo', s.ramType],
    ['speed', 'Velocidad', amount(s.speedMhz, 'MHz')],
    ['capacity', 'Capacidad total', present(s.capacityGb) ? gb(s.capacityGb) : null],
    ['modules', 'Módulos', present(s.modulesQty) ? String(s.modulesQty) : null],
    ['cas', 'Latencia CAS', present(s.casLatency) ? `CL${s.casLatency}` : null],
    ['formFactor', 'Formato', s.formFactor],
  ],
  gpu: (s) => [
    ['tdp', 'Consumo (TDP)', amount(s.tdpW, 'W')],
    ['memory', 'Memoria de video', amount(s.memoryGb, 'GB')],
    ['length', 'Longitud', amount(s.lengthMm, 'mm')],
    ['slotWidth', 'Ancho en ranuras', present(s.slotWidth) ? `${s.slotWidth} ranuras` : null],
    ['interface', 'Interfaz', s.interface],
  ],
  psu: (s) => [
    ['wattage', 'Potencia', amount(s.wattageW, 'W')],
    ['efficiency', 'Certificación de eficiencia', s.efficiencyRating],
    ['modular', 'Modularidad', s.modular],
    ['formFactor', 'Factor de forma', s.formFactor],
  ],
  case: (s) => [
    ['formFactor', 'Factor de forma', s.formFactor],
    ['mb', 'Placas base compatibles', list(s.supportedMbFormFactors)],
    ['psu', 'Fuentes compatibles', list(s.supportedPsuFormFactors)],
    ['gpuMax', 'Longitud máxima de GPU', amount(s.maxGpuLengthMm, 'mm')],
    ['coolerMax', 'Altura máxima del disipador', amount(s.maxCoolerHeightMm, 'mm')],
  ],
  cooler: (s) => [
    ['type', 'Tipo', s.waterCooled === true ? 'Líquida' : s.waterCooled === false ? 'Aire' : null],
    ['height', 'Altura', amount(s.heightMm, 'mm')],
    ['radiator', 'Radiador', amount(s.radiatorMm, 'mm')],
    ['sockets', 'Sockets compatibles', list(s.sockets)],
  ],
  storage: (s) => [
    ['type', 'Tipo', s.storageType],
    ['interface', 'Interfaz', s.interface],
    ['capacity', 'Capacidad', present(s.capacityGb) ? gb(s.capacityGb) : null],
    ['formFactor', 'Formato', s.formFactor],
  ],
};

/** Claves de las filas que se destacan como datos clave de la ficha (hasta cuatro). */
const KEY_ROWS = {
  cpu: ['socket', 'cores', 'clock', 'tdp'],
  motherboard: ['socket', 'formFactor', 'chipset', 'ramType'],
  ram: ['ramType', 'speed', 'capacity', 'cas'],
  gpu: ['memory', 'tdp', 'length', 'interface'],
  psu: ['wattage', 'efficiency', 'modular', 'formFactor'],
  case: ['formFactor', 'mb', 'gpuMax', 'coolerMax'],
  cooler: ['type', 'height', 'radiator', 'sockets'],
  storage: ['capacity', 'type', 'interface', 'formFactor'],
};

/**
 * Tabla de especificaciones completa de un componente. Los datos desconocidos (`null`) devuelven
 * `value: null` para mostrarlos como "No disponible", nunca como cero.
 * @param {string} category
 * @param {Record<string, any> | null | undefined} specs
 * @returns {{ key: string, label: string, value: string | null }[]}
 */
export function specRows(category, specs) {
  if (!specs || !rowBuilders[category]) return [];
  return rowBuilders[category](specs).map(([key, label, value]) => ({
    key,
    label,
    value: present(value) ? value : null,
  }));
}

/**
 * Hasta cuatro datos clave de la pieza para el encabezado de la ficha; omite los que no se conocen.
 * @param {string} category
 * @param {Record<string, any> | null | undefined} specs
 */
export function keyMetrics(category, specs) {
  const wanted = KEY_ROWS[category] ?? [];
  return specRows(category, specs)
    .filter((row) => wanted.includes(row.key) && row.value !== null)
    .slice(0, 4);
}

/** Nombre en español de cada categoría (singular y para listados). */
export const categoryLabels = {
  cpu: 'Procesadores',
  gpu: 'Tarjetas gráficas',
  motherboard: 'Placas base',
  ram: 'Memoria RAM',
  storage: 'Almacenamiento',
  psu: 'Fuentes',
  cooler: 'Refrigeración',
  case: 'Gabinetes',
};
