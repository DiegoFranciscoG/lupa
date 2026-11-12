// Legal and transparency pages. Version 2026.11. These texts must be reviewed by a lawyer
// before the risk signals are published (see docs/legal.md).

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}
export interface LegalPage {
  title: string;
  updated: string;
  sections: LegalSection[];
}

const contact = (email: string | null) =>
  email ? `escribiendo a ${email}` : 'por el correo de contacto del proyecto, que se publicará en esta página antes del lanzamiento';

export function legalPages(email: string | null): Record<string, LegalPage> {
  return {
    'aviso-legal': {
      title: 'Aviso legal',
      updated: '2026-11-11',
      sections: [
        {
          heading: 'Quién publica este sitio',
          paragraphs: [
            'LUPA es un proyecto personal, independiente y sin fines de lucro de Diego Francisco Granda Zhingre (Cuenca, Ecuador). No pertenece al SERCOP, a la Contraloría ni a ninguna institución pública, y no recibe financiamiento de proveedores del Estado.',
            `Puedes contactar al responsable ${contact(email)}.`,
          ],
        },
        {
          heading: 'Qué es y qué no es',
          paragraphs: [
            'LUPA reorganiza datos públicos de contratación para facilitar su lectura. Es una herramienta informativa: no es una fuente oficial, no constituye asesoría legal y no emite juicios sobre personas ni instituciones.',
            'Las señales describen datos que se apartan de lo habitual según una metodología pública. Una señal no prueba una irregularidad y puede tener explicaciones legítimas. Ante cualquier diferencia, prevalece la información oficial del Sistema Oficial de Contratación Pública del Ecuador.',
          ],
        },
        {
          heading: 'Origen y licencia de los datos',
          paragraphs: [
            'Los datos provienen del Servicio Nacional de Contratación Pública (SERCOP), en el estándar de datos abiertos de contrataciones (OCDS), tal como los publica Open Contracting Partnership. Se usan bajo la licencia Creative Commons Atribución 3.0 Ecuador (CC BY 3.0 EC).',
            'Cambios realizados por LUPA: aplanado de los documentos JSON a tablas, normalización de nombres y unidades, agregaciones, cálculo de indicadores y enmascaramiento de los identificadores de personas naturales. Cada página indica la instantánea de datos de la que sale.',
          ],
        },
        {
          heading: 'Código y contenidos propios',
          paragraphs: [
            'El código fuente se publica con licencia MIT. Los textos de metodología pueden reutilizarse citando a LUPA.',
          ],
        },
        {
          heading: 'Responsabilidad',
          paragraphs: [
            'Se procura que los datos y cálculos sean exactos y se publican sus pruebas de calidad, pero pueden existir errores heredados de la fuente o del procesamiento. Si encuentras uno, repórtalo: se corrige y se anota en el registro de correcciones.',
          ],
        },
      ],
    },
    privacidad: {
      title: 'Aviso de privacidad',
      updated: '2026-11-11',
      sections: [
        {
          heading: 'Datos de quien visita el sitio',
          paragraphs: [
            'LUPA no pide registro, no tiene formularios, no usa cookies, no usa herramientas de analítica ni publicidad y no carga recursos de terceros. Las consultas se ejecutan dentro de tu navegador y no se envían a ningún servidor de LUPA.',
            'El servicio de alojamiento del sitio puede registrar datos técnicos de acceso (dirección IP, fecha y página solicitada) según su propia política. LUPA no recibe ni trata esos registros.',
          ],
        },
        {
          heading: 'Datos personales que aparecen en la información pública',
          paragraphs: [
            'Los datos de contratación son de acceso público y se publican por obligación legal. Aun así, LUPA aplica la Ley Orgánica de Protección de Datos Personales (LOPDP) con un criterio de minimización.',
            'Cuando un proveedor o una entidad es una persona natural, su RUC contiene su número de cédula. Por eso LUPA no publica ese RUC ni el nombre: lo reemplaza por la etiqueta «Persona natural» y un identificador aleatorio, no crea fichas ni listas ordenadas de personas naturales y las excluye de la red de relaciones. Una prueba automática impide publicar cualquier número de cédula de persona natural.',
            'La clasificación usa el tercer dígito del RUC. Ante la duda, el dato se trata como de persona natural.',
          ],
        },
        {
          heading: 'Tus derechos',
          paragraphs: [
            `Puedes ejercer tus derechos de acceso, rectificación, actualización, eliminación, oposición y los demás que reconoce la LOPDP ${contact(email)}. Se responde en un plazo máximo de 15 días.`,
            'Si consideras que no se atendió tu solicitud, puedes acudir a la Superintendencia de Protección de Datos Personales.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies',
      updated: '2026-11-11',
      sections: [
        {
          heading: 'LUPA no usa cookies',
          paragraphs: [
            'Este sitio no instala cookies propias ni de terceros, ni técnicas ni de analítica ni de publicidad.',
            'Solo guarda en el almacenamiento local de tu navegador un indicador de que cerraste el aviso informativo, para no volver a mostrarlo. Ese dato no sale de tu equipo, no te identifica y puedes borrarlo desde la configuración del navegador.',
          ],
        },
        {
          heading: 'Archivos que descarga tu navegador',
          paragraphs: [
            'Para responder tus consultas, el navegador descarga fragmentos de archivos de datos (Parquet) y el motor de base de datos DuckDB en WebAssembly desde el mismo sitio. Quedan en la caché normal del navegador.',
          ],
        },
      ],
    },
    'derecho-de-respuesta': {
      title: 'Derecho de respuesta',
      updated: '2026-11-11',
      sections: [
        {
          heading: 'Para entidades y proveedores',
          paragraphs: [
            `Cualquier entidad o proveedor que aparezca en LUPA puede aportar contexto sobre un proceso o una señal ${contact(email)}. Indica el código del proceso (ocid) y la explicación que quieres que se publique.`,
            'La respuesta se publica junto al dato en un plazo máximo de 10 días hábiles, sin editarla salvo para retirar datos personales de terceros. Si la respuesta demuestra un error, se corrige el dato y se registra en el registro de correcciones.',
          ],
        },
        {
          heading: 'Lo que LUPA no hace',
          paragraphs: [
            'LUPA no recibe denuncias, no publica comentarios del público y no difunde datos de contacto personales.',
          ],
        },
      ],
    },
    correcciones: {
      title: 'Registro de correcciones',
      updated: '2026-11-11',
      sections: [
        {
          heading: 'Cómo funciona',
          paragraphs: [
            'Cada corrección de datos, de cálculo o de texto se anota aquí con la fecha, qué cambió y por qué. Las versiones anteriores de los datos siguen disponibles por instantánea.',
          ],
        },
        {
          heading: '2026-11-11 · Versión inicial',
          paragraphs: [
            'Primera publicación de la metodología 2026.11. Durante las pruebas se detectaron y corrigieron antes de publicar: precios unitarios menores a USD 0,0001 que se redondeaban a cero; entidades compradoras con RUC de persona natural que entraban a la red; y códigos de proceso que contenían el número de cédula de una persona natural, que ahora se publican con ese número reemplazado.',
          ],
        },
      ],
    },
  };
}
