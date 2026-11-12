# Investigación y fuentes

Consulta realizada el 2026-11-11. Cuando dos fuentes se contradicen, gana la oficial y más reciente.

| # | Fuente | URL | Consultada | Qué se tomó de aquí |
|---|---|---|---|---|
| 1 | OCP Data Registry — Ecuador SERCOP (publicación 110) | https://data.open-contracting.org/en/publication/110 | 2026-11-11 | Publicador SERCOP, prefijo OCID `ocds-5wno2w`, cobertura ene-2015 a nov-2026, recolección mensual (última: 2026-11-10), archivos `AAAA.jsonl.gz` y `full.jsonl.gz`, conteos (2 231 165 licitaciones, 2 243 110 adjudicaciones, 3 182 365 ítems adjudicados, 2 167 009 contratos, 0 ítems de contrato), tres problemas de calidad conocidos. |
| 2 | Licencia Creative Commons Atribución 3.0 Ecuador | https://creativecommons.org/licenses/by/3.0/ec/ | 2026-11-11 | Permite copiar, transformar y redistribuir con atribución, enlace a la licencia e indicación de cambios. Regla R-LIC. |
| 3 | Portal de datos abiertos del SERCOP | https://datosabiertos.compraspublicas.gob.ec/PLATAFORMA/datos-abiertos | 2026-11-11 | Fuente original de los datos que recoge OCP. Enlace de atribución. |
| 4 | Open Contracting Data Standard 1.1 | https://standard.open-contracting.org/1.1/es/ | 2026-11-11 | Estructura de una entrega compilada (`tender`, `awards[].items[].unit.value`, `parties[].roles`, `bids.details`). |
| 5 | Cardinal 0.0.9 (Open Contracting Partnership, MIT) | https://cardinal.readthedocs.io/ | 2026-11-11 | Comandos `coverage`, `prepare`, `indicators`; campos que exige cada indicador R003…R058. |
| 6 | DuckDB 2.0.0 LTS | https://duckdb.org/2026/10/21/announcing-duckdb-200 | 2026-11-11 | Versión LTS (soporte hasta oct-2027). Formato de archivo v69 que versiones previas no leen. Lambda `lambda x: …` obligatoria (la flecha `->` está desactivada). |
| 7 | Guía de migración a DuckDB 2.0 | https://duckdb.org/docs/2.0/operations_manual/migration.html | 2026-11-11 | Cambios incompatibles: parser PEG, `~` parcial, NULL tipado, división por cero lanza error. |
| 8 | DuckLake 1.1 | https://ducklake.select/2026/10/21/ducklake-11/ | 2026-11-11 | Requiere DuckDB ≥ 2.0. `ATTACH 'ducklake:…' (DATA_PATH …)`, `AT (VERSION => n)`, `snapshots()`, `set_commit_message`. |
| 9 | Extensión duckpgq | https://duckdb.org/community_extensions/extensions/duckpgq | 2026-11-11 | `INSTALL duckpgq FROM community; LOAD duckpgq; SET active_grammar_extensions = ['duckpgq'];`. Probado en DuckDB 2.0.0: MATCH, ANY SHORTEST, `weakly_connected_component`, `pagerank` funcionan. |
| 10 | DuckDB-Wasm (npm `@duckdb/duckdb-wasm`) | https://github.com/duckdb/duckdb-wasm/releases | 2026-11-11 | Última estable en npm: 1.32.0 (motor 1.4.x). No lee archivos `.duckdb` v2.0 → al navegador solo se publica Parquet. |
| 11 | Astryx (Meta, MIT) | https://astryx.atmeta.com/docs/getting-started | 2026-11-11 | `@astryxdesign/core` 0.7.14, repo `github.com/meta/astryx`, mantenedores de Meta en npm. React ≥ 19 y `@stylexjs/stylex` ^0.19. CSS `reset.css` + `astryx.css`, componente `Theme`. Beta. |
| 13 | Rust 1.99.1 | https://blog.rust-lang.org/2026/10/15/Rust-1.99.1/ | 2026-11-11 | Versión estable usada en la imagen Docker de compilación. |
| 14 | SERCOP — Montos de contratación 2025 (enero) | https://registrodelapropiedad.quito.gob.ec/wp-content/uploads/2025/01/Montos-de-contratacion-2025.pdf (copia de la tabla SERCOP `micro_montos_08_01_2025`) | 2026-11-11 | PIE 2025 = USD 36 063 017 083,08. Ínfima cuantía ≤ 0,0000002 × PIE = USD 7 212,60. Menor cuantía bienes/servicios < 0,000002 × PIE = USD 72 126,03. Cotización 72 126,03 – 540 945,26 (0,000015 × PIE). |
| 15 | SERCOP — Infografía de montos 2025 (agosto) | https://portal.compraspublicas.gob.ec/sercop/wp-content/uploads/2025/08/INFOGRAFIA-MONTOS.pdf | 2026-11-11 | Tras la reforma: ínfima cuantía ≤ USD 10 000 para bienes, servicios, obras y consultoría; sobre USD 10 000, subasta inversa / licitación / concurso público. |
| 16 | Primicias — Ley de Integridad Pública vigente | https://www.primicias.ec/politica/ley-integridad-publica-ecuador-vigente-registro-oficial-99342/ | 2026-11-11 | Publicada en Registro Oficial el 2025-06-26 y vigente desde esa fecha; elimina cotización, menor cuantía y contratación preferente. (Fuente periodística: se usa solo para la fecha, confirmada por la infografía oficial #15.) |
| 17 | LOSNCP reformada (RO 140, 2025-10-07) | https://portal.compraspublicas.gob.ec/sercop/anexos/ | 2026-11-11 | Texto vigente de la ley. Confirma que los procedimientos dependen del monto. |
| 18 | LOPDP (RO Suplemento 459, 2021-05-26) y su Reglamento (2023-11-13) | https://www.spdp.gob.ec/marco-normativo/ | 2026-11-11 | Marco de protección de datos. Minimización, deber de informar (aviso de privacidad). |
| 19 | SPDP — Política de cookies de la propia Superintendencia | https://www.spdp.gob.ec/politica-de-cookies/ | 2026-11-11 | Práctica de referencia: consentimiento solo para cookies no técnicas. LUPA no usa cookies. |
| 20 | Cloudflare R2 — precios | https://developers.cloudflare.com/r2/pricing/ | 2026-11-11 | Capa gratuita 10 GB-mes, 1 M operaciones clase A, 10 M clase B, sin costo de salida. |
| 21 | Expreso — escasez de medicinas | https://www.expreso.ec/actualidad/politica/msp-y-sercop-escasez-de-medicinas-y-riesgos-en-compras-persisten-270548.html | 2026-11-11 | Contexto del problema (no se usa como dato). |
| 22 | El Diario — Comisión Anticorrupción pide auditoría | https://www.eldiario.ec/ecuador/comision-nacional-anticorrupcion-exige-a-la-contraloria-investigar-la-compra-centralizada-de-medicamentos-para-el-iess-y-el-msp-07112025/ | 2026-11-11 | Contexto del problema (no se usa como dato). |

## Medición propia sobre los datos (2025.jsonl.gz, descargado 2026-11-11)

Ver `docs/verificacion.md`. Resumen: 111 983 procesos; 92 % de los ítems adjudicados traen precio unitario y 99,9 % código CPC; solo 157 procesos traen ofertas detalladas (`bids.details`).

## Supuestos (no verificados) — avisados

- **SUPUESTO-01 · Regla del tercer dígito del RUC.** Se asume que un RUC con tercer dígito 0–5 corresponde a persona natural (6 = sector público, 9 = sociedad privada). Es la regla de uso común, pero no la encontré escrita en una página del SRI; las páginas de RUC del SRI no la publican. El enmascaramiento se aplica de forma conservadora: todo RUC que **no** empiece con tercer dígito 6 o 9 se trata como persona natural.
- **SUPUESTO-02 · Umbrales 2015–2024 y 2026.** No encontré la tabla oficial de cada año. Solo se cargan en `parametro_normativo` los de 2025 (verificados, #14 y #15). Para otros años el indicador de fragmentación **no se calcula** y la interfaz lo dice.
- **SUPUESTO-03 · Régimen de emergencia.** En 2025 ningún `procurementMethodDetails` contiene "emergencia". El indicador "peso de la emergencia" se calcula solo si la etiqueta aparece en los datos; si no, se reporta como no disponible.
- **SUPUESTO-04 · Uso de cookies.** La LOPDP no menciona cookies de forma expresa; no hallé una guía de la SPDP que obligue a un banner. LUPA no usa cookies ni analítica, e informa de ello en un aviso visible.
