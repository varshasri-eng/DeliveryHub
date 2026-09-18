-- =============================================================
-- search_products() — the actual search entry point
-- ============================================================
-- Combines three things that were previously separate:
--   1. Fuzzy matching (pg_trgm, tolerates typos)
--   2. Ranking by term_type (official > alias > regional > hashtag > typo)
--      so an exact/official name always outranks a fuzzy typo guess,
--      even if the typo happens to score a higher raw similarity.
--   3. Logging every search into search_logs — found or not — which is
--      the data source for "which aliases are missing" (Proposal §4.1).
--
-- Usage:
--   SELECT * FROM search_products('gorintuku');
--   SELECT * FROM search_products('haldi');
--   SELECT * FROM search_products('some totally unrelated word');
-- ============================================================

CREATE OR REPLACE FUNCTION search_products(p_query TEXT)
RETURNS TABLE (
    product_id        INT,
    product_name      VARCHAR,
    matched_term      VARCHAR,
    term_type         VARCHAR,
    match_rank        INT,
    similarity_score  REAL
) AS $$
DECLARE
    v_row_count       INT;
    v_top_product_id  INT;
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        st.search_term,
        st.term_type,
        CASE st.term_type
            WHEN 'official' THEN 1
            WHEN 'alias'    THEN 2
            WHEN 'regional' THEN 3
            WHEN 'hashtag'  THEN 4
            WHEN 'typo'     THEN 5
            ELSE 6
        END::INT AS match_rank,
        similarity(st.search_term, p_query) AS similarity_score
    FROM search_terms st
    JOIN products p ON p.id = st.product_id
    WHERE st.search_term % p_query
       OR st.search_term ILIKE '%' || p_query || '%'
    ORDER BY match_rank ASC, similarity_score DESC
    LIMIT 5;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    IF v_row_count > 0 THEN
        SELECT p.id INTO v_top_product_id
        FROM search_terms st
        JOIN products p ON p.id = st.product_id
        WHERE st.search_term % p_query
           OR st.search_term ILIKE '%' || p_query || '%'
        ORDER BY
            CASE st.term_type
                WHEN 'official' THEN 1
                WHEN 'alias'    THEN 2
                WHEN 'regional' THEN 3
                WHEN 'hashtag'  THEN 4
                WHEN 'typo'     THEN 5
                ELSE 6
            END,
            similarity(st.search_term, p_query) DESC
        LIMIT 1;
    END IF;

    INSERT INTO search_logs (
        search_query,
        matched_product_id,
        result_found
    )
    VALUES (
        p_query,
        v_top_product_id,
        v_row_count > 0
    );
END;
$$ LANGUAGE plpgsql;
