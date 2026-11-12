# Metodología (versión 2026.11)

Toda la lógica vive en SQL: `sql/models/04_signals.sql`. Los umbrales están en `sql/seeds/umbral_metodologia.csv` y los límites legales en `sql/seeds/parametro_normativo.csv`, con su fuente. Cambiar un umbral cambia la versión de la metodología.

## Principios

1. Una señal describe un hecho verificable; no es una acusación.
2. Nada inventado: un dato que no existe en la fuente no se estima ni se rellena. Se informa.
3. Nada quemado: umbrales y límites en tablas versionadas, no en el código.
4. Lenguaje: nunca «corrupción», «fraude», «robo», «sobreprecio», «culpable», «delito» o «ilegal» para referirse a un proceso, entidad o proveedor (prueba T-06).
5. Personas naturales: sin RUC, sin nombre, sin fichas, sin rankings y fuera de la red (prueba T-07).

## Indicadores propios

| Indicador | Regla | Mínimos y exclusiones |
|---|---|---|
| Precio unitario atípico | Grupo = mismo CPC + unidad normalizada + año. Se marca si `precio > mediana + 3,5 × 1,4826 × MAD` y `precio ≥ 2 × mediana`. | ≥ 10 compras. El grupo debe ser homogéneo: `p75 / p25 ≤ 3` (un CPC genérico mezcla productos distintos). Razones > 50 se tratan como error de registro y van a calidad de datos. |
| Concentración | Índice Herfindahl-Hirschman de los proveedores de la entidad en el año (0 a 10 000). Se marca desde 1 800 (guías de fusiones de EE. UU., 2023). | ≥ 20 adjudicaciones en el año. |
| Compras repetidas bajo el límite | ≥ 3 adjudicaciones de la misma entidad al mismo proveedor en 30 días, cada una entre el 80 % y el 100 % de un límite vigente en su fecha, cuya suma supera el límite. | Solo fechas con límite verificado (2025). |
| Proveedor reciente con adjudicación grande | Adjudicación en el 5 % superior del año a un proveedor cuya primera adjudicación en los datos ocurrió hace ≤ 90 días. | Desde el segundo año de datos. |
| Peso de la emergencia | Proporción del gasto por emergencia. | No disponible: la fuente no etiqueta emergencias. |

## Indicadores de Cardinal (Open Contracting Partnership)

| Código | Regla | Estado |
|---|---|---|
| R018 | Un solo oferente en procedimiento abierto o selectivo (se excluye catálogo electrónico). | Calculado donde existe `numberOfTenderers` (24 % de procesos). |
| R003 | Plazo de ofertas menor a 15 días en procedimiento abierto. | Calculado donde existen ambas fechas. |
| R024, R025, R028, R030, R035, R036, R038, R048, R058 | Requieren el detalle de ofertas. | No calculables: la fuente publica ofertas en menos del 1 % de los procesos. |

R018 y R003 se reimplementan en SQL con la definición documentada de Cardinal 0.0.9 para que toda la lógica viva en la base de datos.

## Red (SQL/PGQ)

Grafo `red_compras` con duckpgq: nodos = entidades y empresas (sin personas naturales), aristas = adjudicaciones agregadas. Se calculan PageRank (alcance) y componentes conexos. La red de competencia usa los oferentes publicados (dato parcial).

## Reproducibilidad

Cada carga es una instantánea de DuckLake. `scripts/lupa.sh repro` (T-09) reconstruye desde una instantánea anterior y compara la huella de los agregados. Los archivos de origen se identifican por SHA-256; un año idéntico a la carga anterior no se vuelve a cargar.

## Pruebas

| # | Prueba | Dónde |
|---|---|---|
| T-01 | Conteo cuadra con la fuente | `ingest/tests`, `sql/tests/quality/q01` |
| T-02 | Montos cuadran (tolerancia USD 1 por año) | `ingest/tests`, `q02` |
| T-03 | Señales esperadas en un conjunto revisado a mano | `sql/tests/unit/t03` |
| T-04 | Precio atípico robusto | `sql/tests/unit/t04` |
| T-05 | Grafo con resultado conocido | `sql/tests/unit/t05` |
| T-06 | Lenguaje no acusatorio | `q06`, `web/scripts/check-language.mjs`, e2e |
| T-07 | Ninguna cédula publicada | `q07`, `sql/tests/published/p01`, e2e |
| T-08 | Atribución CC BY 3.0 EC | `p02`, pruebas unitarias y e2e |
| T-09 | Reproducibilidad por instantánea | `scripts/lupa.sh repro` |
| T-10 | Fuente caída conserva la carga anterior | `ingest/tests` |
| T-11 | Primera vista < 300 kB y consulta < 2 s en 4G | `p03`, e2e |
| T-12 | Calidad como consultas de cero filas | `sql/tests/quality` |
