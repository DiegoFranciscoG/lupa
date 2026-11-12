// Simple line icons drawn for LUPA (24×24, stroke = currentColor). Decorative: aria-hidden.
import {useId, type ReactElement} from 'react';

const paths: Record<string, ReactElement> = {
  inicio: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  cifras: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  precios: (
    <>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <circle cx="8" cy="8" r="1.5" />
    </>
  ),
  entidades: (
    <>
      <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
    </>
  ),
  proveedores: (
    <>
      <path d="M3 7h18v13H3zM8 7V4h8v3M3 12h18" />
    </>
  ),
  senales: (
    <>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </>
  ),
  red: (
    <>
      <circle cx="5" cy="12" r="2.5" />
      <circle cx="19" cy="5" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M7.2 10.8 16.8 6.2M7.2 13.2l9.6 4.6" />
    </>
  ),
  consola: (
    <>
      <path d="M3 4h18v16H3zM7 9l3 3-3 3M12 15h5" />
    </>
  ),
  datos: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  mas: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8M12 8v8" />
    </>
  ),
  buscar: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
};

export function Icon({name}: {name: keyof typeof paths | string}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? paths.mas}
    </svg>
  );
}

/** LUPA mark: an Andean condor (Ecuador's national bird) whose eye is a magnifying lens. */
export function Logo() {
  const clip = `lupa-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <circle cx="24" cy="24" r="23" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="23" fill="var(--lupa-accent)" />
      <g clipPath={`url(#${clip})`}>
        <path d="M2 48C4 38 12 32.5 23 32.5S42 38 46 48z" fill="var(--lupa-logo-ink)" />
        <path d="M19.5 33V24h7v9z" fill="var(--lupa-logo-ink)" />
        <path
          d="M12.5 33.2c1.2-1.8 3-2 4.2-.8.9-1.6 3-1.9 4.2-.6 1-1.5 3.2-1.6 4.3-.2 1.1-1.4 3.2-1.3 4.1.3 1.4-1.1 3.4-.6 3.9 1-2.6 3.4-7 5-11.6 5s-8.6-1.9-9.1-5.7z"
          fill="var(--lupa-logo-light)"
          stroke="var(--lupa-logo-ink)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>
      <path
        d="M17.6 21.6C16.8 14.8 21.4 10.6 27.6 10.6c4.6 0 8 1.9 9.4 5.2l2.8 1c2.4.9 3.2 3.6 1.8 6.2-.9-1.5-2.3-2-3.9-1.4-2 3.4-6 5.4-10.6 5.3-4.7-.1-8.6-2-9.5-5.3z"
        fill="var(--lupa-logo-ink)"
      />
      <path d="M23.4 11.4c1-2.6 5.4-3.6 8.2-1.4" fill="none" stroke="var(--lupa-logo-ink)" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="29.6" cy="17" r="3.7" fill="var(--lupa-logo-light)" stroke="var(--lupa-accent)" strokeWidth="1.3" />
      <circle cx="30" cy="16.8" r="1.45" fill="var(--lupa-logo-ink)" />
      <path d="M32.4 19.8l2.4 2.4" stroke="var(--lupa-logo-light)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
