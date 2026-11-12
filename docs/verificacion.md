# Verificación de la fase 1

Fecha: 2026-11-11. Máquina: laptop Windows 11, 8 núcleos. Motor: DuckDB 2.0.0.

## 1. Descarga de un año (2025)

| Medida | Valor |
|---|---|
| Archivo | `https://data.open-contracting.org/en/publication/110/download?name=2025.jsonl.gz` |
| Tamaño comprimido | 85,6 MB |
| Tamaño descomprimido | 805 MB |
| Tiempo de descarga | 10 s |
| Procesos (líneas) | 111 983 (todos con etiqueta `compiled`) |
| `ocid` distintos | 111 983 |
| Lectura completa en DuckDB 2.0 | 22 s |
| Procesos con adjudicación | 108 083 |
| Suma de adjudicaciones en USD | 4 153 572 786 |

## 2. Cobertura de campos (lo crítico)

| Pregunta | Respuesta | Consecuencia |
|---|---|---|
| ¿Hay precio unitario en `awards/items`? | **Sí**: 160 082 de 173 763 ítems (92 %) traen `unit.value.amount` > 0 | El precio comparado es viable. |
| ¿Hay cantidad? | Sí, 100 % | |
| ¿Hay unidad de medida? | Parcial: 85 750 (49 %). Nombres no normalizados (`Metro Cúbico` / `Metro Cubico`) | La comparación agrupa por código CPC + unidad normalizada; "sin unidad" es su propio grupo. |
| ¿Hay clasificación? | Sí: CPC en 99,9 % (código de 9–10 dígitos) | Grupo de comparación = código CPC completo. |
| Grupos comparables (≥ 10 compras mismo CPC + unidad) | 1 834 grupos, que cubren 147 272 ítems (92 % de los que tienen precio) | Cumple la regla de mínimo 10. |
| ¿Hay ofertas (`bids.details`)? | Casi no: 157 procesos (1 963 ofertas, todas `valid`) | Indicadores de Cardinal basados en ofertas (R024, R025, R028, R030, R035, R036, R038, R058) **no son calculables** de forma representativa. |
| ¿Hay número de oferentes? | `tender.numberOfTenderers` en 26 397 procesos (24 %) | R018 (oferta única) se calcula solo sobre ese subconjunto. |
| ¿Hay periodo de presentación? | Solo en los procesos con `tender` completo | R003 (plazo corto) calculable en ese subconjunto. |
| ¿Hay tipo de procedimiento? | `procurementMethodDetails` en 98 %: Catálogo electrónico (mayoría), Subasta Inversa, Menor Cuantía, Cotización, Licitación, Régimen especial… | `dim_procedimiento` se arma desde los valores reales. |
| ¿Hay régimen de emergencia? | **No** en 2025: ningún valor contiene "emergencia" | "Peso de la emergencia" queda **no disponible** (SUPUESTO-03). |
| ¿Hay provincia? | `parties[].address.region` | `dim_territorio` por provincia. Cantón no viene. |
| Identificador de partes | `EC-RUC-<RUC>-<n>` con esquema `EC-RUC` | Se extrae el RUC de 13 dígitos. 27 000 apariciones de proveedores tienen tercer dígito 0–5 → personas naturales (SUPUESTO-01). |

## 3. Problemas de calidad medidos

| Problema conocido | Medido en 2025 |
|---|---|
| Fecha de adjudicación anterior a la fecha de la entrega | 22 214 de 109 580 adjudicaciones (20 %) |
| `id` repetido en `awards/items` dentro del mismo proceso | 0 casos en 2025 (se mantiene la regla) |
| Partes sin identificador | 1 822 |
| Adjudicaciones sin moneda | 4 |

## 4. Tamaño total

Parquet del año 2025 con todo el documento: 55 MB (zstd). Ítems adjudicados aplanados: 3,2 MB. Doce años ≈ 0,7–1 GB en crudo y < 300 MB en marts. **Cabe holgadamente en los 10 GB de R2.**

## 5. duckpgq con DuckDB 2.0

Probado: `CREATE PROPERTY GRAPH`, `GRAPH_TABLE … MATCH`, `ANY SHORTEST … {1,3}`, `weakly_connected_component`, `pagerank`. Todos devuelven lo esperado en un grafo de 5 nodos. Versión de la extensión: `9c11bc192a` (repositorio community). Licencia: MIT (repositorio `cwida/duckpgq-extension`).

## 6. DuckDB-Wasm

Última versión estable en npm: **1.32.0** (las 1.33.x son `-dev`). Su motor es de la rama 1.4, así que **no** abre archivos `.duckdb` de la 2.0 ni catálogos DuckLake 1.1. Decisión: el navegador solo lee **Parquet** (formato abierto) y JSON pequeños.

## 7. Observable Framework vs. React

Observable Framework 1.13.4 (último cambio: abril 2026). Sigue vivo pero con poca actividad. Como pediste usar **Astryx** (sistema de diseño de Meta para React 19), el sitio se construye con **Vite + React 19 + Astryx**, y los gráficos con **Observable Plot**. Mantiene la idea original: sitio estático, sin servidor de API.

## 8. Umbrales de procedimiento

Fuente oficial: tablas anuales del SERCOP calculadas sobre el Presupuesto Inicial del Estado (PIE). Verificados solo para 2025:

| Vigencia | Procedimiento | Límite | Fuente |
|---|---|---|---|
| 2025-01-01 a 2025-06-25 | Ínfima cuantía | ≤ USD 7 212,60 (0,0000002 × PIE) | investigacion #14 |
| 2025-01-01 a 2025-06-25 | Menor cuantía bienes y servicios | < USD 72 126,03 (0,000002 × PIE) | investigacion #14 |
| 2025-01-01 a 2025-06-25 | Cotización bienes y servicios | USD 72 126,03 – 540 945,26 (0,000015 × PIE) | investigacion #14 |
| desde 2025-06-26 | Ínfima cuantía (bienes, servicios, obras, consultoría) | ≤ USD 10 000 | investigacion #15, #16 |

## 9. Cardinal

`ocdscardinal` 0.0.9 (MIT). Se usa su comando `coverage` en la ingesta (informe de campos) y `indicators` para R003 y R018, los únicos con datos suficientes. Los demás quedan documentados como "no calculables con los datos publicados".

## Ajustes de alcance que salen de aquí

1. El precio comparado **sí se promete**: 92 % de los ítems lo permiten.
2. Las señales de colusión basadas en ofertas **no se prometen**.
3. La red `compitio_con` se arma con `tender.tenderers` (24 % de procesos) y se etiqueta como parcial.
4. El indicador de emergencia queda como no disponible mientras los datos no traigan la etiqueta.
