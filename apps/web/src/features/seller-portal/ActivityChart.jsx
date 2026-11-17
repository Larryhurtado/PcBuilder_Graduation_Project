import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { longDay, shortDay } from './ranges.js';

const METRICS = {
  whatsappClicks: {
    label: 'Clics a WhatsApp',
    unit: 'clics',
    heading: 'Evolución de clics a WhatsApp',
  },
  views: {
    label: 'Visitas a ofertas',
    unit: 'visitas',
    heading: 'Evolución de visitas a ofertas',
  },
};

const number = new Intl.NumberFormat('es-CO');

function DetailTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const { day, value } = payload[0].payload;
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <p className="text-label-sm capitalize text-on-surface-variant">{longDay(day)}</p>
      <p className="tnum text-label-md text-on-surface">
        {number.format(value)} {METRICS[metric].unit}
      </p>
    </div>
  );
}

/**
 * Evolución diaria de clics o visitas. El gráfico es visual: para lectores de pantalla va una tabla
 * con los mismos datos. `days` trae un registro por día (los días sin eventos, en cero).
 * @param {{ days: { day: string, views: number, whatsappClicks: number }[], metric: 'whatsappClicks' | 'views' }} props
 */
export default function ActivityChart({ days, metric }) {
  const data = days.map((item) => ({
    day: item.day,
    label: shortDay(item.day),
    value: item[metric],
  }));
  // Con muchos días (30 o más) se muestran las etiquetas de a una cada tantas
  const interval = days.length > 10 ? Math.ceil(days.length / 8) - 1 : 0;

  return (
    <div>
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 800, height: 288 }}
        >
          <AreaChart data={data} margin={{ top: 12, right: 24, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="actividad-relleno" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary-container)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--color-primary-container)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-outline-variant)"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="label"
              interval={interval}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              width={36}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--color-outline)', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-outline)', strokeDasharray: '4 4' }}
              content={<DetailTooltip metric={metric} />}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#actividad-relleno)"
              dot={{ r: 3, fill: 'var(--color-primary)', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* El contenedor es el que se oculta: una tabla no respeta el ancho de 1 px y desbordaría */}
      <div className="sr-only">
        <table>
          <caption>{METRICS[metric].label} por día</caption>
          <thead>
            <tr>
              <th scope="col">Día</th>
              <th scope="col">{METRICS[metric].label}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.day}>
                <th scope="row">{longDay(item.day)}</th>
                <td>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { METRICS };
