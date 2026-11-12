# Política de seguridad

## Reportar una vulnerabilidad

No abras un issue público. Escríbeme por GitHub (perfil DiegoFranciscoG) con los pasos para reproducir el problema. Respondo en un máximo de 7 días.

Si encuentras un dato personal publicado por error (por ejemplo, un número de cédula), repórtalo por el mismo medio: se retira en la siguiente carga y se anota en el registro de correcciones.

## Superficie de ataque

LUPA no tiene servidor de aplicación, base de datos en línea, cuentas, formularios ni API: es un sitio estático que consulta archivos Parquet de solo lectura desde el navegador. Las consultas de la consola SQL se ejecutan en el navegador de quien las escribe y no llegan a ningún servidor.

## Prácticas aplicadas

- Secretos solo por variables de entorno y GitHub Secrets (`LUPA_HASH_SALT`); sin valor por defecto: si falta, el pipeline y `docker compose` no arrancan. `.env` no se versiona.
- Escaneo de secretos con gitleaks (binario con SHA-256 verificado) en cada push y pull request.
- GitHub Actions con permisos mínimos (`contents: read`) y acciones fijadas por hash de commit.
- Dependencias con versión exacta, `npm audit` en CI y Dependabot para Cargo, npm, Docker y Actions.
- Descargas verificadas: CLI de DuckDB y gitleaks con SHA-256; archivos de origen con su huella registrada en cada carga.
- Imágenes Docker multi-etapa, con versión fija, usuario no root, sistema de archivos de solo lectura en el servidor web y `no-new-privileges`.
- Cabeceras: Content-Security-Policy sin orígenes externos, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Entradas del usuario en consultas: siempre con parámetros (`?`), nunca concatenadas; términos de búsqueda normalizados y con longitud máxima.
- Datos personales (LOPDP): identificadores de personas naturales enmascarados con hash con sal; pruebas que bloquean la publicación si aparece un número de cédula.
