import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Campo de búsqueda: busca solo al dejar de escribir (o con Enter). Para vaciarlo cuando cambia la
 * URL, quien lo usa le pone un `key` que dependa del valor de la URL.
 * @param {{ initial: string, onSearch: (value: string) => void, label: string, placeholder: string, className?: string }} props
 */
export default function SearchField({ initial, onSearch, label, placeholder, className = '' }) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (value.trim() === initial) return undefined;
    const timer = setTimeout(() => onSearch(value.trim()), 350);
    return () => clearTimeout(timer);
  }, [value, initial, onSearch]);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
      className={`relative flex-1 ${className}`}
    >
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        autoComplete="off"
        className="h-12 w-full rounded-xl border border-outline-variant bg-surface pl-11 pr-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25"
      />
    </form>
  );
}
