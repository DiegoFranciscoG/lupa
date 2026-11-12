// Interface copy, versioned with the code. Language rule (test T-06): describe verifiable
// facts; never state or suggest wrongdoing.

export const CONTACT_EMAIL: string | null = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || null;

export const SITE = {
  name: 'LUPA',
  tagline: 'La contratación pública de Ecuador, a la vista de todos.',
  intro:
    'Cifras de los procesos de compra del Estado publicados por el SERCOP, ordenadas para que cualquiera pueda leerlas y comprobarlas.',
  signalNotice:
    'Una señal no es una acusación. Indica un dato que se aparta de lo habitual y que puede tener explicaciones legítimas. Cada señal muestra el dato exacto, el umbral y el método.',
  railNote: 'Datos abiertos del SERCOP, explicados con cifras que puedes comprobar. Sin cuentas, sin publicidad.',
  consoleMobile: 'La consola funciona mejor en una computadora: descarga partes de archivos grandes y muestra tablas anchas.',
};

export const NAV: Array<{path: string; label: string; icon: string; mobile?: boolean; short?: string}> = [
  {path: '', label: 'Inicio', icon: 'inicio', mobile: true},
  {path: 'cifras', label: 'Cifras', icon: 'cifras', mobile: true},
  {path: 'precios', label: 'Precio comparado', icon: 'precios', mobile: true, short: 'Precios'},
  {path: 'entidades', label: 'Entidades', icon: 'entidades', mobile: true},
  {path: 'proveedores', label: 'Proveedores', icon: 'proveedores'},
  {path: 'senales', label: 'Señales', icon: 'senales', mobile: true},
  {path: 'red', label: 'Red', icon: 'red'},
  {path: 'consola', label: 'Consola SQL', icon: 'consola'},
  {path: 'datos', label: 'Datos abiertos', icon: 'datos'},
];

export const FOOTER_LINKS: Array<{path: string; label: string}> = [
  {path: 'metodologia', label: 'Metodología'},
  {path: 'calidad', label: 'Calidad de datos'},
  {path: 'correcciones', label: 'Registro de correcciones'},
  {path: 'derecho-de-respuesta', label: 'Derecho de respuesta'},
  {path: 'aviso-legal', label: 'Aviso legal'},
  {path: 'privacidad', label: 'Privacidad'},
  {path: 'cookies', label: 'Cookies'},
];

export const SOURCE_LINKS = {
  sercop: 'https://datosabiertos.compraspublicas.gob.ec/PLATAFORMA/datos-abiertos',
  ocp: 'https://data.open-contracting.org/en/publication/110',
  license: 'https://creativecommons.org/licenses/by/3.0/ec/',
  repo: 'https://github.com/DiegoFranciscoG/lupa',
};

export const FAMILY_LABEL: Record<string, string> = {
  'Catálogo electrónico': 'Catálogo electrónico',
  'Subasta inversa electrónica': 'Subasta inversa',
  'Ínfima cuantía': 'Ínfima cuantía',
  'Menor cuantía': 'Menor cuantía',
  Cotización: 'Cotización',
  Licitación: 'Licitación',
  Consultoría: 'Consultoría',
  'Contratación directa': 'Contratación directa',
  'Régimen especial': 'Régimen especial',
  Emergencia: 'Emergencia',
  Otro: 'Otro o sin dato',
};

export const INDICATOR_TEXT: Record<string, {title: string; what: string}> = {
  PRECIO_ATIPICO: {
    title: 'Precio unitario atípico',
    what: 'El precio por unidad está muy por encima de la mediana de compras del mismo ítem, con la misma unidad y en el mismo año.',
  },
  CONCENTRACION: {
    title: 'Concentración de proveedores',
    what: 'Un proveedor reúne gran parte del monto que la entidad adjudicó en el año (índice Herfindahl-Hirschman).',
  },
  FRAGMENTACION: {
    title: 'Compras repetidas bajo el límite',
    what: 'Varias adjudicaciones seguidas al mismo proveedor, cada una cerca del límite de un procedimiento, que juntas lo superan.',
  },
  PROVEEDOR_NUEVO: {
    title: 'Proveedor reciente con adjudicación grande',
    what: 'Una adjudicación entre las más altas del año a un proveedor que apareció por primera vez en los datos pocos días antes.',
  },
  EMERGENCIA: {
    title: 'Peso del régimen de emergencia',
    what: 'Proporción del gasto de la entidad hecha por emergencia.',
  },
  R018_OFERTA_UNICA: {
    title: 'Un solo oferente',
    what: 'El proceso abierto o selectivo registró una sola oferta (indicador R018 de Cardinal).',
  },
  R003_PLAZO_CORTO: {
    title: 'Plazo corto para ofertar',
    what: 'El plazo de presentación de ofertas fue menor a la referencia (indicador R003 de Cardinal).',
  },
};
