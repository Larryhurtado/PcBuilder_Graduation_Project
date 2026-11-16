import { Link } from 'react-router';
import Icon from './Icon.jsx';

/**
 * Encabezado de sección: título, descripción y un enlace de "ver todo" a la derecha.
 * @param {{ title: string, description?: string, action?: { to: string, label: string, icon?: string }, id?: string }} props
 */
export default function SectionHeader({ title, description, action, id }) {
  return (
    <div className="mb-space-xl flex flex-col justify-between gap-space-xs md:flex-row md:items-end">
      <div>
        <h2 id={id} className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-3xl text-body-md text-on-surface-variant">{description}</p>
        )}
      </div>
      {action && (
        <Link
          to={action.to}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start text-label-md text-primary hover:underline md:min-h-0 md:self-auto"
        >
          <span>{action.label}</span>
          <Icon name={action.icon ?? 'arrow_forward'} className="text-[16px]" />
        </Link>
      )}
    </div>
  );
}
