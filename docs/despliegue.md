# Despliegue (gratis, GitHub Pages)

Verificado el 2026-11-12. Límites de GitHub Pages: sitio de hasta 1 GB, archivos de hasta 100 MB y un ancho de banda orientativo de 100 GB al mes. LUPA publica unos 300 MB (datos, motor DuckDB-Wasm y feeds RSS). No requiere tarjeta.

## Una sola vez

1. Crear el repositorio y subir el código (lo haces tú tras «VOY A SUBIR»).
2. Crear el secreto de la sal (64 caracteres hex) y guardarlo también en un gestor de contraseñas: si cambia, cambian los identificadores públicos `NAT-…`.

   ```bash
   gh secret set LUPA_HASH_SALT --repo DiegoFranciscoG/lupa --body "$(openssl rand -hex 32)"
   ```

3. Variables públicas del sitio:

   ```bash
   gh variable set LUPA_SITE_URL --repo DiegoFranciscoG/lupa --body "https://diegofranciscog.github.io/lupa/"
   gh variable set LUPA_CONTACT_EMAIL --repo DiegoFranciscoG/lupa --body "tu-correo-de-contacto"
   ```

4. Activar Pages con origen «GitHub Actions»:

   ```bash
   gh api -X POST repos/DiegoFranciscoG/lupa/pages -f build_type=workflow
   ```

5. Lanzar la primera carga (12 años, unos 15 minutos):

   ```bash
   gh workflow run publicar.yml --repo DiegoFranciscoG/lupa -f years=2015..2026
   ```

## Actualización de los datos

- El flujo [`publicar.yml`](../.github/workflows/publicar.yml) corre **cada lunes**. El registro de Open Contracting Partnership recoge los datos del SERCOP una vez al mes; los años cuyo archivo no cambió (misma huella SHA-256) se saltan, así que una semana sin novedades no genera una instantánea nueva.
- El año en curso cambia en cada recolección; los años cerrados casi nunca. La página de inicio muestra hasta qué fecha llegan los datos y cuándo se actualizaron.
- Si la fuente falla, se conserva la carga anterior de ese año y el sitio sigue publicado (T-10). Si una prueba de calidad falla, no se publica (T-12).
- El lago DuckLake se conserva entre corridas en la caché de GitHub Actions (se borra tras 7 días sin uso; la corrida semanal la mantiene viva). Si se pierde, la siguiente corrida reconstruye todo desde la fuente.

## Comprobar el sitio publicado

```bash
cd web && LUPA_E2E_URL=https://diegofranciscog.github.io/lupa/ npx playwright test
```
