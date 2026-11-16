/**
 * Las 8 ranuras del asistente, en el orden del diseño. Cada ranura es una categoría del catálogo
 * (la caja se llama `pcCase` solo cuando se le habla al motor; aquí siempre es `case`).
 * `pick` es el nombre en singular y `plural` el de los listados ("Ver gabinetes compatibles").
 */
export const SLOTS = [
  {
    category: 'cpu',
    number: '01',
    title: 'Procesador / CPU',
    short: 'CPU',
    pick: 'procesador',
    plural: 'procesadores',
    hint: 'El procesador define el socket del armado y qué placas base puedes elegir.',
  },
  {
    category: 'motherboard',
    number: '02',
    title: 'Placa Base / MB',
    short: 'Motherboard',
    pick: 'placa base',
    plural: 'placas base',
    hint: 'Debe coincidir con el socket de la CPU y el tipo de memoria RAM.',
  },
  {
    category: 'ram',
    number: '03',
    title: 'Memoria RAM',
    short: 'RAM',
    pick: 'memoria RAM',
    plural: 'memorias RAM',
    hint: 'El tipo (DDR4 o DDR5) debe ser el que soporta la placa base.',
  },
  {
    category: 'gpu',
    number: '04',
    title: 'Tarjeta Gráfica / GPU',
    short: 'GPU',
    pick: 'tarjeta gráfica',
    plural: 'tarjetas gráficas',
    hint: 'Su longitud debe caber en el gabinete y la fuente debe cubrir su consumo.',
  },
  {
    category: 'storage',
    number: '05',
    title: 'Almacenamiento',
    short: 'Almacenamiento',
    pick: 'unidad de almacenamiento',
    plural: 'unidades de almacenamiento',
    hint: 'Elige una unidad SSD o HDD para el sistema y tus archivos.',
  },
  {
    category: 'psu',
    number: '06',
    title: 'Fuente de Poder / PSU',
    short: 'Fuente PSU',
    pick: 'fuente de poder',
    plural: 'fuentes de poder',
    hint: 'Su potencia debe cubrir el consumo estimado con un 25 % de margen.',
  },
  {
    category: 'case',
    number: '07',
    title: 'Chasis / Gabinete',
    short: 'Chasis',
    pick: 'gabinete',
    plural: 'gabinetes',
    hint: 'Debe admitir el formato de la placa base y la longitud de la GPU.',
  },
  {
    category: 'cooler',
    number: '08',
    title: 'Refrigeración / Cooler',
    short: 'Cooler',
    pick: 'disipador',
    plural: 'disipadores',
    hint: 'Debe ser compatible con el socket de la CPU y caber en el gabinete.',
  },
];

export const slotByCategory = Object.fromEntries(SLOTS.map((slot) => [slot.category, slot]));
