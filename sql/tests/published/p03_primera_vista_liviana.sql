-- T-11 (data side): the first view (panorama + meta) stays under 300 kB.
SELECT 'first view data is ' || sum(size) || ' bytes (limit 300000)'
FROM read_blob(['web/public/data/panorama.json', 'web/public/data/meta.json', 'web/public/data/feed.json', 'web/public/data/tendencias.json'])
HAVING sum(size) > 300000;
