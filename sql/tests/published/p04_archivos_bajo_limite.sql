-- Every published file stays under 25 MiB (static host limit per file).
SELECT 'file too large: ' || filename || ' (' || size || ' bytes)'
FROM read_blob('web/public/data/**/*')
WHERE size > 25 * 1024 * 1024;
