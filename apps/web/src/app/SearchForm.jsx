import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Icon from '../shared/ui/Icon.jsx';

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * Buscador global de la barra superior. Al enviar lleva al catálogo con `?q=`.
 * Con `shortcut`, la tecla "/" enfoca el campo desde cualquier parte de la página.
 * @param {{ className?: string, inputClassName?: string, shortcut?: boolean, onSubmitted?: () => void }} props
 */
export default function SearchForm({
  className = '',
  inputClassName = '',
  shortcut = false,
  onSubmitted,
}) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!shortcut) return undefined;
    const onKeyDown = (event) => {
      if (
        event.key !== '/' ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTyping(event.target)
      )
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [shortcut]);

  const submit = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate({ pathname: '/catalogo', search: `?${new URLSearchParams({ q })}` });
    onSubmitted?.();
  };

  return (
    <form role="search" onSubmit={submit} className={`relative flex items-center ${className}`}>
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 text-[18px] text-outline"
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar CPU, GPU, tienda..."
        aria-label="Buscar componentes o tiendas"
        autoComplete="off"
        className={`h-10 w-full rounded-xl border border-outline-variant bg-surface pl-9 pr-8 text-body-sm text-on-surface transition-colors focus:border-primary-container focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-primary-container/25 ${inputClassName}`}
      />
      {shortcut && (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 rounded border border-outline-variant bg-surface-variant px-1.5 py-0.5 text-[10px] text-outline"
        >
          /
        </kbd>
      )}
    </form>
  );
}
