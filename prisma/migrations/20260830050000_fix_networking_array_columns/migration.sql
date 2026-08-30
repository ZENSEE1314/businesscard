-- Recover prod drift: the networking_fields recovery re-added canHelp/lookingFor
-- as scalar `text` on some databases instead of `text[]`, so any profile that
-- actually filled them in (e.g. bullet-joined "A • B • C") crashed Prisma with
-- P2023 "List field did not return an Array". Convert scalar columns to text[],
-- splitting existing values on bullets/commas/semicolons/newlines. Databases
-- where the column is already an array (data_type = 'ARRAY') are left untouched.
--
-- NOTE: Postgres forbids subqueries inside an ALTER COLUMN ... USING transform,
-- so the split uses regexp_split_to_array (a plain set-returning-free function),
-- not ARRAY(SELECT ...).

DO $$
DECLARE
  tbl text;
  col text;
  cur_type text;
  split_pat text := '\s*[' || chr(8226) || ',;\n]\s*';
BEGIN
  FOREACH tbl IN ARRAY ARRAY['Profile', 'BusinessProfile'] LOOP
    FOREACH col IN ARRAY ARRAY['canHelp', 'lookingFor'] LOOP
      SELECT data_type INTO cur_type
      FROM information_schema.columns
      WHERE table_name = tbl AND column_name = col;

      IF cur_type = 'text' THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', tbl, col);
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I TYPE text[] USING (
             CASE
               WHEN %I IS NULL OR btrim(%I) = '''' THEN ARRAY[]::text[]
               ELSE array_remove(regexp_split_to_array(btrim(%I), %L), '''')
             END
           )', tbl, col, col, col, col, split_pat);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT ARRAY[]::text[]', tbl, col);
      END IF;
    END LOOP;
  END LOOP;
END $$;
