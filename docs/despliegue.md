# Ejecución y actualización de datos

LUPA se publica como código. El sitio se levanta en cualquier equipo con Docker y siempre descarga los datos más recientes del registro de Open Contracting Partnership (SERCOP).

## Levantar el sitio

```bash
cp .env.example .env          # completa LUPA_HASH_SALT con: openssl rand -hex 32
docker compose up --build     # año 2025 de ejemplo; sitio en http://localhost:8080
```

Todos los años (2015 a hoy, unos 15 minutos y 1,1 GB de descarga):

```bash
LUPA_YEARS=2015..2026 docker compose up --build
```

## Actualizar los datos

Volver a ejecutar `docker compose up` descarga de nuevo cada año pedido:

- Si el archivo de un año no cambió (misma huella SHA-256), se salta y no crea una instantánea nueva.
- Si cambió, se carga como una instantánea nueva de DuckLake; las anteriores siguen consultables.
- Si la fuente falla, se conserva la carga anterior de ese año (T-10).
- Si una prueba de calidad falla, no se publican los datos (T-12).

El registro de OCP recoge los datos del SERCOP una vez al mes, así que tiene sentido actualizar mensualmente. La página de inicio muestra hasta qué fecha llegan los datos y cuándo se actualizaron.

## Publicar como sitio (opcional, a futuro)

El sitio es estático (`web/dist` más `web/public/data`) y cabe en cualquier hosting gratuito con archivos de hasta 100 MB, por ejemplo GitHub Pages. No se usa Cloudflare Pages porque limita cada archivo a 25 MiB y el motor DuckDB-Wasm pesa 34 MB.

## Probar un sitio levantado

```bash
cd web && LUPA_E2E_URL=http://localhost:8080/ npx playwright test
```
