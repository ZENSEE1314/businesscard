-- Recover prod drift: the networking_fields recovery re-added canHelp/lookingFor
-- as scalar `text` on some databases instead of `text[]`, so any profile that
-- actually filled them in (e.g. bullet-joined "A • B • C") crashed Prisma with
-- P2023 "List field did not return an Array". Convert scalar columns to text[],
-- splitting existing values on bullets/commas/semicolons/newlines. Databases
-- where the column is already an array (data_type = 'ARRAY') are left untouched.

DO $$
DECLARE
  tbl text;
  col text;
  cur_type text;
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
               ELSE array_remove(
                 ARRAY(
                   SELECT btrim(part)
                   FROM regexp_split_to_table(%I, ''\s*[' || chr(8226) || ',;\n]\s*'') AS part
                 ),
                 ''''
               )
             END
           )', tbl, col, col, col, col);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT ARRAY[]::text[]', tbl, col);
      END IF;
    END LOOP;
  END LOOP;
END $$;
