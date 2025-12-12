-- name: SearchCatserByFTS :many
SELECT *
FROM catser_search_fts(
    p_query        => sqlc.narg('query'),
    p_group_code   => sqlc.narg('group_code'),
    p_class_code   => sqlc.narg('class_code'),
    p_service_code => sqlc.narg('service_code'),
    p_status       => sqlc.narg('status'),
    p_limit        => sqlc.arg('limit'),
    p_offset       => sqlc.arg('offset')
);

-- name: SearchCatserByEmbedding :many
SELECT *
FROM catser_search_embedding(
    p_embedding  => sqlc.arg('embedding')::vector(1536),
    p_group_code => sqlc.narg('group_code'),
    p_class_code => sqlc.narg('class_code'),
    p_status     => sqlc.narg('status'),
    p_limit      => sqlc.arg('limit'),
    p_offset     => sqlc.arg('offset')
);

-- name: UpsertCatserItem :one
INSERT INTO catser_item (
    material_service_type,
    group_code,
    group_name,
    class_code,
    class_name,
    service_code,
    service_description,
    status
)
VALUES (
    sqlc.arg('material_service_type'),
    sqlc.arg('group_code'),
    sqlc.arg('group_name'),
    sqlc.arg('class_code'),
    sqlc.arg('class_name'),
    sqlc.arg('service_code'),
    sqlc.arg('service_description'),
    sqlc.arg('status')
)
ON CONFLICT (service_code)
DO UPDATE SET
    material_service_type = EXCLUDED.material_service_type,
    group_code            = EXCLUDED.group_code,
    group_name            = EXCLUDED.group_name,
    class_code            = EXCLUDED.class_code,
    class_name            = EXCLUDED.class_name,
    service_description   = EXCLUDED.service_description,
    status                = EXCLUDED.status
RETURNING id, material_service_type, group_code, group_name, class_code, class_name, service_code, service_description, status;

-- name: UpdateCatserItemEmbedding :one
UPDATE catser_item
SET embedding = sqlc.arg('embedding')::vector(1536)
WHERE service_code = sqlc.arg('service_code')
RETURNING id, material_service_type, group_code, group_name, class_code, class_name, service_code, service_description, status, embedding;

-- name: GetCatserItemsWithoutEmbedding :many
SELECT *
FROM catser_item
WHERE embedding IS NULL
ORDER BY service_code
LIMIT sqlc.arg('limit')
OFFSET sqlc.arg('offset');

-- name: CountCatserItems :one
SELECT COUNT(*) FROM catser_item;

-- name: CountCatserByGroup :many
SELECT group_code, group_name, COUNT(*) as count
FROM catser_item
GROUP BY group_code, group_name
ORDER BY count DESC
LIMIT 10;

-- name: CountCatserByStatus :many
SELECT status, COUNT(*) as count
FROM catser_item
GROUP BY status
ORDER BY status;
