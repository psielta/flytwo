-- name: SearchCatmatByFTS :many
SELECT *
FROM catmat_search_fts(
    p_query      => sqlc.narg('query'),
    p_group_code => sqlc.narg('group_code'),
    p_class_code => sqlc.narg('class_code'),
    p_pdm_code   => sqlc.narg('pdm_code'),
    p_ncm_code   => sqlc.narg('ncm_code'),
    p_limit      => sqlc.arg('limit'),
    p_offset     => sqlc.arg('offset')
);

-- name: SearchCatmatByEmbedding :many
SELECT *
FROM catmat_search_embedding(
    p_embedding  => sqlc.arg('embedding')::vector(1536),
    p_group_code => sqlc.narg('group_code'),
    p_class_code => sqlc.narg('class_code'),
    p_pdm_code   => sqlc.narg('pdm_code'),
    p_ncm_code   => sqlc.narg('ncm_code'),
    p_limit      => sqlc.arg('limit'),
    p_offset     => sqlc.arg('offset')
);

-- name: UpsertCatmatItem :one
INSERT INTO catmat_item (
    group_code,
    group_name,
    class_code,
    class_name,
    pdm_code,
    pdm_name,
    item_code,
    item_description,
    ncm_code
)
VALUES (
    sqlc.arg('group_code'),
    sqlc.arg('group_name'),
    sqlc.arg('class_code'),
    sqlc.arg('class_name'),
    sqlc.arg('pdm_code'),
    sqlc.arg('pdm_name'),
    sqlc.arg('item_code'),
    sqlc.arg('item_description'),
    sqlc.narg('ncm_code')
)
ON CONFLICT (item_code)
DO UPDATE SET
    group_code      = EXCLUDED.group_code,
    group_name      = EXCLUDED.group_name,
    class_code      = EXCLUDED.class_code,
    class_name      = EXCLUDED.class_name,
    pdm_code        = EXCLUDED.pdm_code,
    pdm_name        = EXCLUDED.pdm_name,
    item_description = EXCLUDED.item_description,
    ncm_code        = EXCLUDED.ncm_code
RETURNING *;

-- name: UpdateCatmatItemEmbedding :one
UPDATE catmat_item
SET embedding = sqlc.arg('embedding')::vector(1536)
WHERE item_code = sqlc.arg('item_code')
RETURNING *;

-- name: GetCatmatItemsWithoutEmbedding :many
SELECT *
FROM catmat_item
WHERE embedding IS NULL
ORDER BY item_code
LIMIT sqlc.arg('limit')
OFFSET sqlc.arg('offset');
