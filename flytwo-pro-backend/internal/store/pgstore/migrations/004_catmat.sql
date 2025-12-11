-- Write your migrate up statements here
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TEXT SEARCH CONFIGURATION portuguese_unaccent (COPY = portuguese);
ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, portuguese_stem;

CREATE TABLE catmat_item (
    id              bigserial PRIMARY KEY,

    group_code      smallint       NOT NULL, -- Código do Grupo (2 dígitos)
    group_name      text           NOT NULL,

    class_code      integer        NOT NULL, -- Código da Classe (4 dígitos)
    class_name      text           NOT NULL,

    pdm_code        integer        NOT NULL, -- Código do PDM (5 dígitos)
    pdm_name        text           NOT NULL,

    item_code       integer        NOT NULL, -- Código do Item (6 dígitos, único)
    item_description text          NOT NULL,

    ncm_code        text,                   -- Código NCM (até 8 chars; converta "-" para NULL na importação)

    -- Documento FTS gerado automaticamente
    search_document tsvector GENERATED ALWAYS AS (
        to_tsvector(
            'portuguese_unaccent',
            coalesce(group_name, '')      || ' ' ||
            coalesce(class_name, '')      || ' ' ||
            coalesce(pdm_name, '')        || ' ' ||
            coalesce(item_description, '')|| ' ' ||
            coalesce(ncm_code, '')
        )
    ) STORED,

    -- Embedding do item (descrição + nomes, por ex.)
    -- Ajuste 1536 para a dimensão do modelo que você for usar
    embedding       vector(1536)
);

ALTER TABLE catmat_item
    ADD CONSTRAINT uq_catmat_item_code UNIQUE (item_code);

-- FTS Index
CREATE INDEX idx_catmat_item_search_document
    ON catmat_item
    USING GIN (search_document);
-- Usando distância de cosseno (recomendado para embeddings normalizados)
CREATE INDEX idx_catmat_item_embedding_hnsw
    ON catmat_item
    USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_catmat_item_group_code ON catmat_item (group_code);
CREATE INDEX idx_catmat_item_class_code ON catmat_item (class_code);
CREATE INDEX idx_catmat_item_pdm_code   ON catmat_item (pdm_code);
CREATE INDEX idx_catmat_item_ncm_code   ON catmat_item (ncm_code);
CREATE INDEX idx_catmat_item_item_code  ON catmat_item (item_code);

CREATE INDEX idx_catmat_item_group_class
    ON catmat_item (group_code, class_code);

CREATE INDEX idx_catmat_item_group_class_pdm
    ON catmat_item (group_code, class_code, pdm_code);

CREATE OR REPLACE FUNCTION catmat_search_fts(
    p_query       text,
    p_group_code  smallint DEFAULT NULL,
    p_class_code  integer  DEFAULT NULL,
    p_pdm_code    integer  DEFAULT NULL,
    p_ncm_code    text     DEFAULT NULL,
    p_limit       integer  DEFAULT 50,
    p_offset      integer  DEFAULT 0
)
RETURNS TABLE (
    id               bigint,
    group_code       smallint,
    group_name       text,
    class_code       integer,
    class_name       text,
    pdm_code         integer,
    pdm_name         text,
    item_code        integer,
    item_description text,
    ncm_code         text,
    rank             real
)
LANGUAGE plpgsql
AS $$
DECLARE
    ts_query tsquery;
BEGIN
    IF p_query IS NOT NULL AND btrim(p_query) <> '' THEN
        ts_query := websearch_to_tsquery('portuguese_unaccent', p_query);
    END IF;

    -- Sem termo de busca: só aplica filtros e ordena por item_code
    IF ts_query IS NULL THEN
        RETURN QUERY
        SELECT
            i.id,
            i.group_code,
            i.group_name,
            i.class_code,
            i.class_name,
            i.pdm_code,
            i.pdm_name,
            i.item_code,
            i.item_description,
            i.ncm_code,
            0::real AS rank
        FROM catmat_item i
        WHERE (p_group_code IS NULL OR i.group_code = p_group_code)
          AND (p_class_code IS NULL OR i.class_code = p_class_code)
          AND (p_pdm_code   IS NULL OR i.pdm_code   = p_pdm_code)
          AND (p_ncm_code   IS NULL OR i.ncm_code   = p_ncm_code)
        ORDER BY i.item_code
        LIMIT p_limit OFFSET p_offset;

    ELSE
        -- Com FTS: filtra por tsquery e ordena por rank
        RETURN QUERY
        SELECT
            i.id,
            i.group_code,
            i.group_name,
            i.class_code,
            i.class_name,
            i.pdm_code,
            i.pdm_name,
            i.item_code,
            i.item_description,
            i.ncm_code,
            ts_rank_cd(i.search_document, ts_query) AS rank
        FROM catmat_item i
        WHERE (p_group_code IS NULL OR i.group_code = p_group_code)
          AND (p_class_code IS NULL OR i.class_code = p_class_code)
          AND (p_pdm_code   IS NULL OR i.pdm_code   = p_pdm_code)
          AND (p_ncm_code   IS NULL OR i.ncm_code   = p_ncm_code)
          AND i.search_document @@ ts_query
        ORDER BY rank DESC, i.item_code
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$;

-- Search by embedding
CREATE OR REPLACE FUNCTION catmat_search_embedding(
    p_embedding   vector,
    p_group_code  smallint DEFAULT NULL,
    p_class_code  integer  DEFAULT NULL,
    p_pdm_code    integer  DEFAULT NULL,
    p_ncm_code    text     DEFAULT NULL,
    p_limit       integer  DEFAULT 50,
    p_offset      integer  DEFAULT 0
)
RETURNS TABLE (
    id               bigint,
    group_code       smallint,
    group_name       text,
    class_code       integer,
    class_name       text,
    pdm_code         integer,
    pdm_name         text,
    item_code        integer,
    item_description text,
    ncm_code         text,
    distance         real
)
LANGUAGE sql
AS $$
    SELECT
        i.id,
        i.group_code,
        i.group_name,
        i.class_code,
        i.class_name,
        i.pdm_code,
        i.pdm_name,
        i.item_code,
        i.item_description,
        i.ncm_code,
        (i.embedding <=> p_embedding) AS distance  -- menor = mais parecido
    FROM catmat_item i
    WHERE (p_group_code IS NULL OR i.group_code = p_group_code)
      AND (p_class_code IS NULL OR i.class_code = p_class_code)
      AND (p_pdm_code   IS NULL OR i.pdm_code   = p_pdm_code)
      AND (p_ncm_code   IS NULL OR i.ncm_code   = p_ncm_code)
      AND i.embedding IS NOT NULL
    ORDER BY i.embedding <=> p_embedding
    LIMIT p_limit OFFSET p_offset;
$$;

---- create above / drop below ----
-- Remover funções e tabelas criadas nesta migration

DROP FUNCTION IF EXISTS catmat_search_embedding(vector, smallint, integer, integer, text, integer, integer);
DROP FUNCTION IF EXISTS catmat_search_fts(text, smallint, integer, integer, text, integer, integer);

DROP INDEX IF EXISTS idx_catmat_item_group_class_pdm;
DROP INDEX IF EXISTS idx_catmat_item_group_class;
DROP INDEX IF EXISTS idx_catmat_item_item_code;
DROP INDEX IF EXISTS idx_catmat_item_ncm_code;
DROP INDEX IF EXISTS idx_catmat_item_pdm_code;
DROP INDEX IF EXISTS idx_catmat_item_class_code;
DROP INDEX IF EXISTS idx_catmat_item_group_code;
DROP INDEX IF EXISTS idx_catmat_item_embedding_hnsw;
DROP INDEX IF EXISTS idx_catmat_item_search_document;

ALTER TABLE catmat_item DROP CONSTRAINT IF EXISTS uq_catmat_item_code;

DROP TABLE IF EXISTS catmat_item;

-- Write your migrate down statements here. If this migration is irreversible
-- Then delete the separator line above.
