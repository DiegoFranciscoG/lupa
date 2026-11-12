# Resumen para revisión legal

Documento para que un abogado o abogada revise LUPA **antes de publicar las señales de riesgo**. No es asesoría legal.

## Qué publica LUPA

- Datos de contratación pública del SERCOP (OCDS), obtenidos del registro de Open Contracting Partnership, licencia CC BY 3.0 Ecuador.
- Agregados, comparaciones de precios e indicadores («señales») calculados con una metodología pública (`docs/metodologia.md`).
- Nombres y RUC de entidades públicas y de personas jurídicas proveedoras, tal como aparecen en la fuente.

## Medidas ya aplicadas

| Riesgo | Medida |
|---|---|
| Licencia de los datos | Atribución al SERCOP y a OCP, enlace a la licencia e indicación de cambios en cada página, descarga y feed (prueba T-08). |
| Datos de personas naturales (LOPDP) | RUC y nombre nunca publicados; identificador con hash y sal secreta; sin fichas, rankings ni red; prueba que bloquea la publicación si aparece una cédula (T-07). Regla conservadora: si el RUC no es claramente de entidad pública o sociedad, se trata como persona natural. |
| Difamación | Lenguaje factual («precio 4,3 veces la mediana»); palabras prohibidas verificadas por pruebas (T-06); aviso «una señal no es una acusación» en cada página de señales; umbral, dato y método visibles. |
| Errores de la fuente | Problemas de calidad publicados; precios con razones mayores a 50 veces la mediana tratados como error de registro, no como señal; grupos de productos heterogéneos excluidos. |
| Derecho de respuesta | Página con procedimiento y plazo (10 días hábiles). |
| Correcciones | Registro público de correcciones. |
| Cookies y rastreo | Sin cookies, analítica ni recursos de terceros; aviso informativo. |

## Preguntas para la revisión

1. ¿El tratamiento de nombres de personas jurídicas y de servidores públicos que aparecen en la fuente requiere alguna medida adicional?
2. ¿Es adecuado el fundamento de tratamiento (datos de acceso público por obligación legal, interés legítimo de transparencia) bajo la LOPDP y su Reglamento?
3. ¿Los plazos de respuesta indicados (15 días para derechos, 10 días hábiles para el derecho de respuesta) son correctos? (SUPUESTO: no verificados con el texto oficial.)
4. ¿Los textos de cada indicador (`web/src/content/site.ts`, `web/src/components/Post.tsx`) pueden interpretarse como imputación?
5. ¿Se requiere registro ante la Superintendencia de Protección de Datos Personales?
6. ¿El aviso legal y el de privacidad (`web/src/content/legal.ts`) cubren lo exigido?

## Pendientes antes del lanzamiento

- Definir el correo de contacto (`VITE_CONTACT_EMAIL` en la variable de repositorio `LUPA_CONTACT_EMAIL`).
- Revisión de esta lista por un profesional del derecho; posible apoyo de la Facultad de Jurisprudencia de la Universidad de Cuenca o de Fundación Ciudadanía y Desarrollo.
