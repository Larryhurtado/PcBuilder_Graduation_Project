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
