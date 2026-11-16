/** Iconos de línea de las 8 categorías del MVP (trazo uniforme de 1.8). */
const paths = {
  cpu: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </>
  ),
  gpu: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="9" cy="12" r="2.5" />
      <circle cx="15" cy="12" r="2.5" />
      <path d="M5 18v2M9 18v2M13 18v2" />
    </>
  ),
  motherboard: (
    <>
      <path d="M4 4h16v16H4z" />
      <rect x="7" y="7" width="5" height="5" />
      <path d="M15 7h2v2h-2zM15 12h2v5h-2zM7 15h5v2H7z" />
    </>
  ),
  ram: (
    <>
      <rect x="2" y="7" width="20" height="9" rx="1" />
      <path d="M6 16v2M10 16v2M14 16v2M18 16v2M6 10v2M10 10v2M14 10v2M18 10v2" />
    </>
  ),
  storage: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="7" cy="12" r="1.5" />
      <path d="M12 12h5" />
    </>
  ),
  psu: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="10" cy="12" r="3.5" />
      <path d="M18 8h1M18 12h1M18 16h1" />
    </>
  ),
  cooler: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3a4 4 0 0 1 4 4v1M21 12a4 4 0 0 1-4 4h-1M12 21a4 4 0 0 1-4-4v-1M3 12a4 4 0 0 1 4-4h1" />
    </>
  ),
  case: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <circle cx="12" cy="9" r="2.5" />
      <path d="M9 17h6" />
    </>
  ),
};

/**
 * @param {{ category: keyof typeof paths | string, className?: string }} props
 */
export default function CategoryIcon({ category, className = 'h-6 w-6' }) {
  const shape = paths[category];
  if (!shape) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}
