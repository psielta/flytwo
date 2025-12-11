-- Write your migrate up statements here
CREATE TABLE catser_item (
    id                      bigserial PRIMARY KEY,

    -- "Tipo Material Serviço" (normalmente "Serviço")
    material_service_type   text        NOT NULL,

    -- "Grupo Serviço"
    group_code              smallint    NOT NULL,
    group_name              text        NOT NULL, -- descrição do grupo

    -- "Classe Material"
    class_code              integer     NOT NULL,
    class_name              text        NOT NULL, -- descrição da classe

    -- "Código Material Serviço"
    service_code            integer     NOT NULL,
    service_description     text        NOT NULL, -- descrição do serviço

    -- "Sit Atual Mat Serv"
    status                  text        NOT NULL, -- Ativo / Inativo

    -- Documento FTS (já inclui códigos como texto)
    search_document tsvector GENERATED ALWAYS AS (
        to_tsvector(
            'portuguese_unaccent',
            coalesce(material_service_type, '')   || ' ' ||
            coalesce(group_code::text, '')        || ' ' ||
            coalesce(group_name, '')              || ' ' ||
            coalesce(class_code::text, '')        || ' ' ||
            coalesce(class_name, '')              || ' ' ||
            coalesce(service_code::text, '')      || ' ' ||
            coalesce(service_description, '')     || ' ' ||
            coalesce(status, '')
        )
    ) STORED,

    -- Embedding para busca semântica (ajuste 1536 para a dimensão do modelo)
    embedding               vector(1536),

    CONSTRAINT uq_catser_service_code UNIQUE (service_code)
);
CREATE INDEX idx_catser_item_search_document
    ON catser_item
    USING GIN (search_document);
CREATE INDEX idx_catser_item_embedding_hnsw
    ON catser_item
    USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_catser_item_group_code   ON catser_item (group_code);
CREATE INDEX idx_catser_item_class_code   ON catser_item (class_code);
CREATE INDEX idx_catser_item_service_code ON catser_item (service_code);
CREATE INDEX idx_catser_item_status       ON catser_item (status);

-- Opcional: combinados mais usados
CREATE INDEX idx_catser_item_group_class
    ON catser_item (group_code, class_code);
CREATE OR REPLACE FUNCTION catser_search_fts(
    p_query        text,
    p_group_code   smallint DEFAULT NULL,
    p_class_code   integer  DEFAULT NULL,
    p_service_code integer  DEFAULT NULL,
    p_status       text     DEFAULT NULL,
    p_limit        integer  DEFAULT 50,
    p_offset       integer  DEFAULT 0
)
RETURNS TABLE (
    id                   bigint,
    material_service_type text,
    group_code           smallint,
    group_name           text,
    class_code           integer,
    class_name           text,
    service_code         integer,
    service_description  text,
    status               text,
    rank                 real
)
LANGUAGE plpgsql
AS $$
DECLARE
    ts_query tsquery;
BEGIN
    IF p_query IS NOT NULL AND btrim(p_query) <> '' THEN
        ts_query := websearch_to_tsquery('portuguese_unaccent', p_query);
    END IF;

    -- Sem termo de busca: aplica só filtros e ordena por código do serviço
    IF ts_query IS NULL THEN
        RETURN QUERY
        SELECT
            s.id,
            s.material_service_type,
            s.group_code,
            s.group_name,
            s.class_code,
            s.class_name,
            s.service_code,
            s.service_description,
            s.status,
            0::real AS rank
        FROM catser_item s
        WHERE (p_group_code   IS NULL OR s.group_code   = p_group_code)
          AND (p_class_code   IS NULL OR s.class_code   = p_class_code)
          AND (p_service_code IS NULL OR s.service_code = p_service_code)
          AND (p_status       IS NULL OR s.status       = p_status)
        ORDER BY s.service_code
        LIMIT p_limit OFFSET p_offset;

    ELSE
        -- Com FTS: filtra por tsquery e ordena por rank
        RETURN QUERY
        SELECT
            s.id,
            s.material_service_type,
            s.group_code,
            s.group_name,
            s.class_code,
            s.class_name,
            s.service_code,
            s.service_description,
            s.status,
            ts_rank_cd(s.search_document, ts_query) AS rank
        FROM catser_item s
        WHERE (p_group_code   IS NULL OR s.group_code   = p_group_code)
          AND (p_class_code   IS NULL OR s.class_code   = p_class_code)
          AND (p_service_code IS NULL OR s.service_code = p_service_code)
          AND (p_status       IS NULL OR s.status       = p_status)
          AND s.search_document @@ ts_query
        ORDER BY rank DESC, s.service_code
        LIMIT p_limit OFFSET p_offset;
    END IF;
END;
$$;
CREATE OR REPLACE FUNCTION catser_search_embedding(
    p_embedding    vector,
    p_group_code   smallint DEFAULT NULL,
    p_class_code   integer  DEFAULT NULL,
    p_status       text     DEFAULT NULL,
    p_limit        integer  DEFAULT 50,
    p_offset       integer  DEFAULT 0
)
RETURNS TABLE (
    id                   bigint,
    material_service_type text,
    group_code           smallint,
    group_name           text,
    class_code           integer,
    class_name           text,
    service_code         integer,
    service_description  text,
    status               text,
    distance             real
)
LANGUAGE sql
AS $$
    SELECT
        s.id,
        s.material_service_type,
        s.group_code,
        s.group_name,
        s.class_code,
        s.class_name,
        s.service_code,
        s.service_description,
        s.status,
        (s.embedding <=> p_embedding) AS distance   -- menor = mais similar
    FROM catser_item s
    WHERE (p_group_code IS NULL OR s.group_code = p_group_code)
      AND (p_class_code IS NULL OR s.class_code = p_class_code)
      AND (p_status     IS NULL OR s.status     = p_status)
      AND s.embedding IS NOT NULL
    ORDER BY s.embedding <=> p_embedding
    LIMIT p_limit OFFSET p_offset;
$$;

---- create above / drop below ----

DROP FUNCTION IF EXISTS catser_search_embedding(vector, smallint, integer, text, integer, integer);
DROP FUNCTION IF EXISTS catser_search_fts(text, smallint, integer, integer, text, integer, integer);

DROP INDEX IF EXISTS idx_catser_item_group_class;
DROP INDEX IF EXISTS idx_catser_item_status;
DROP INDEX IF EXISTS idx_catser_item_service_code;
DROP INDEX IF EXISTS idx_catser_item_class_code;
DROP INDEX IF EXISTS idx_catser_item_group_code;
DROP INDEX IF EXISTS idx_catser_item_embedding_hnsw;
DROP INDEX IF EXISTS idx_catser_item_search_document;

ALTER TABLE catser_item DROP CONSTRAINT IF EXISTS uq_catser_service_code;

DROP TABLE IF EXISTS catser_item;



-- Write your migrate down statements here. If this migration is irreversible
-- Then delete the separator line above.
