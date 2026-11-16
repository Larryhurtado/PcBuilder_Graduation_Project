import { useEffect, useRef } from 'react';

const variants = {
  center:
    'm-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-3xl bg-surface-container',
  drawer:
    'my-0 ml-auto mr-0 h-dvh max-h-none w-full max-w-lg overflow-y-auto rounded-none bg-surface-container',
};

/**
 * Diálogo modal con el elemento nativo <dialog>: atrapa el foco, se cierra con Escape y devuelve
 * el foco a quien lo abrió. Se cierra también al hacer clic fuera del panel.
 * @param {{ open: boolean, onClose: () => void, labelledBy: string, variant?: 'center' | 'drawer', className?: string, children: import('react').ReactNode }} props
 */
export default function Dialog({
  open,
  onClose,
  labelledBy,
  variant = 'center',
  className = '',
  children,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return undefined;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden'; // el fondo no se desplaza mientras el diálogo está abierto
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className={`p-0 text-on-surface backdrop:bg-surface-container-lowest/85 ${variants[variant]} ${className}`}
    >
      {open ? children : null}
    </dialog>
  );
}
