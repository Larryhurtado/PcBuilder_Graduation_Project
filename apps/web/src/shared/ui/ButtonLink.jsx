import { Link } from 'react-router';

const base =
  'inline-flex h-12 items-center justify-center gap-space-xs rounded-xl px-6 text-label-md transition-all active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100';

const variants = {
  primary: 'bg-primary-container text-on-primary-container hover:bg-primary-container/90',
  secondary: 'bg-surface-container text-on-surface hover:bg-surface-variant',
  outline:
    'border border-outline-variant bg-transparent text-on-surface hover:border-outline hover:bg-surface-variant',
};

/**
 * Enlace con aspecto de botón (navegación interna).
 * @param {{ to: string, variant?: 'primary' | 'secondary' | 'outline', className?: string, children: import('react').ReactNode }} props
 */
export default function ButtonLink({ to, variant = 'primary', className = '', children, ...rest }) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </Link>
  );
}
