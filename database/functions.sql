[
  {
    "schema": "auth",
    "function_name": "email",
    "arguments": "",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION auth.email()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.email', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')\n  )::text\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "jwt",
    "arguments": "",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION auth.jwt()\n RETURNS jsonb\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n    coalesce(\n        nullif(current_setting('request.jwt.claim', true), ''),\n        nullif(current_setting('request.jwt.claims', true), '')\n    )::jsonb\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "role",
    "arguments": "",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION auth.role()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.role', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')\n  )::text\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "uid",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION auth.uid()\n RETURNS uuid\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.sub', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')\n  )::uuid\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "armor",
    "arguments": "bytea",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.armor(bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_armor$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "armor",
    "arguments": "bytea, text[], text[]",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_armor$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "crypt",
    "arguments": "text, text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.crypt(text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_crypt$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "dearmor",
    "arguments": "text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.dearmor(text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_dearmor$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "decrypt",
    "arguments": "bytea, bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.decrypt(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_decrypt$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "decrypt_iv",
    "arguments": "bytea, bytea, bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "digest",
    "arguments": "bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_digest$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "digest",
    "arguments": "text, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.digest(text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_digest$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "encrypt",
    "arguments": "bytea, bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.encrypt(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_encrypt$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "encrypt_iv",
    "arguments": "bytea, bytea, bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "gen_random_bytes",
    "arguments": "integer",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(integer)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_random_bytes$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "gen_random_uuid",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.gen_random_uuid()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE\nAS '$libdir/pgcrypto', $function$pg_random_uuid$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "gen_salt",
    "arguments": "text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.gen_salt(text)\n RETURNS text\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_gen_salt$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "gen_salt",
    "arguments": "text, integer",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.gen_salt(text, integer)\n RETURNS text\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "grant_pg_cron_access",
    "arguments": "",
    "return_type": "event_trigger",
    "definition": "CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF EXISTS (\n    SELECT\n    FROM pg_event_trigger_ddl_commands() AS ev\n    JOIN pg_extension AS ext\n    ON ev.objid = ext.oid\n    WHERE ext.extname = 'pg_cron'\n  )\n  THEN\n    grant usage on schema cron to postgres with grant option;\n\n    alter default privileges in schema cron grant all on tables to postgres with grant option;\n    alter default privileges in schema cron grant all on functions to postgres with grant option;\n    alter default privileges in schema cron grant all on sequences to postgres with grant option;\n\n    alter default privileges for user supabase_admin in schema cron grant all\n        on sequences to postgres with grant option;\n    alter default privileges for user supabase_admin in schema cron grant all\n        on tables to postgres with grant option;\n    alter default privileges for user supabase_admin in schema cron grant all\n        on functions to postgres with grant option;\n\n    grant all privileges on all tables in schema cron to postgres with grant option;\n    revoke all on table cron.job from postgres;\n    grant select on table cron.job to postgres with grant option;\n  END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "grant_pg_graphql_access",
    "arguments": "",
    "return_type": "event_trigger",
    "definition": "CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    func_is_graphql_resolve bool;\nBEGIN\n    func_is_graphql_resolve = (\n        SELECT n.proname = 'resolve'\n        FROM pg_event_trigger_ddl_commands() AS ev\n        LEFT JOIN pg_catalog.pg_proc AS n\n        ON ev.objid = n.oid\n    );\n\n    IF func_is_graphql_resolve\n    THEN\n        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func\n        DROP FUNCTION IF EXISTS graphql_public.graphql;\n        create or replace function graphql_public.graphql(\n            \"operationName\" text default null,\n            query text default null,\n            variables jsonb default null,\n            extensions jsonb default null\n        )\n            returns jsonb\n            language sql\n        as $$\n            select graphql.resolve(\n                query := query,\n                variables := coalesce(variables, '{}'),\n                \"operationName\" := \"operationName\",\n                extensions := extensions\n            );\n        $$;\n\n        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last\n        -- function in the extension so we need to grant permissions on existing entities AND\n        -- update default permissions to any others that are created after `graphql.resolve`\n        grant usage on schema graphql to postgres, anon, authenticated, service_role;\n        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;\n        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;\n        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;\n\n        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles\n        grant usage on schema graphql_public to postgres with grant option;\n        grant usage on schema graphql to postgres with grant option;\n    END IF;\n\nEND;\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "grant_pg_net_access",
    "arguments": "",
    "return_type": "event_trigger",
    "definition": "CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM pg_event_trigger_ddl_commands() AS ev\n    JOIN pg_extension AS ext\n    ON ev.objid = ext.oid\n    WHERE ext.extname = 'pg_net'\n  )\n  THEN\n    IF NOT EXISTS (\n      SELECT 1\n      FROM pg_roles\n      WHERE rolname = 'supabase_functions_admin'\n    )\n    THEN\n      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;\n    END IF;\n\n    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n\n    IF EXISTS (\n      SELECT FROM pg_extension\n      WHERE extname = 'pg_net'\n      -- all versions in use on existing projects as of 2025-02-20\n      -- version 0.12.0 onwards don't need these applied\n      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')\n    ) THEN\n      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;\n      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;\n\n      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;\n      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;\n\n      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;\n      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;\n\n      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n    END IF;\n  END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "hmac",
    "arguments": "text, text, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.hmac(text, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_hmac$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "hmac",
    "arguments": "bytea, bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.hmac(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_hmac$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pg_stat_statements",
    "arguments": "showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone",
    "return_type": "SETOF record",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone)\n RETURNS SETOF record\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_1_11$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pg_stat_statements_info",
    "arguments": "OUT dealloc bigint, OUT stats_reset timestamp with time zone",
    "return_type": "record",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone)\n RETURNS record\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_info$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pg_stat_statements_reset",
    "arguments": "userid oid, dbid oid, queryid bigint, minmax_only boolean",
    "return_type": "timestamp with time zone",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0, minmax_only boolean DEFAULT false)\n RETURNS timestamp with time zone\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_reset_1_11$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_armor_headers",
    "arguments": "text, OUT key text, OUT value text",
    "return_type": "SETOF record",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text)\n RETURNS SETOF record\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_armor_headers$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_key_id",
    "arguments": "bytea",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_key_id(bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_key_id_w$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt",
    "arguments": "bytea, bytea, text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt",
    "arguments": "bytea, bytea",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt",
    "arguments": "bytea, bytea, text, text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt_bytea",
    "arguments": "bytea, bytea, text, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt_bytea",
    "arguments": "bytea, bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt_bytea",
    "arguments": "bytea, bytea",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_encrypt",
    "arguments": "text, bytea",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_encrypt",
    "arguments": "text, bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_encrypt_bytea",
    "arguments": "bytea, bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_encrypt_bytea",
    "arguments": "bytea, bytea",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_decrypt",
    "arguments": "bytea, text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_decrypt",
    "arguments": "bytea, text, text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_decrypt_bytea",
    "arguments": "bytea, text, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_decrypt_bytea",
    "arguments": "bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_encrypt",
    "arguments": "text, text, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_encrypt",
    "arguments": "text, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_encrypt_bytea",
    "arguments": "bytea, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_encrypt_bytea",
    "arguments": "bytea, text, text",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgrst_ddl_watch",
    "arguments": "",
    "return_type": "event_trigger",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  cmd record;\nBEGIN\n  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()\n  LOOP\n    IF cmd.command_tag IN (\n      'CREATE SCHEMA', 'ALTER SCHEMA'\n    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'\n    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'\n    , 'CREATE VIEW', 'ALTER VIEW'\n    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'\n    , 'CREATE FUNCTION', 'ALTER FUNCTION'\n    , 'CREATE TRIGGER'\n    , 'CREATE TYPE', 'ALTER TYPE'\n    , 'CREATE RULE'\n    , 'COMMENT'\n    )\n    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp\n    AND cmd.schema_name is distinct from 'pg_temp'\n    THEN\n      NOTIFY pgrst, 'reload schema';\n    END IF;\n  END LOOP;\nEND; $function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgrst_drop_watch",
    "arguments": "",
    "return_type": "event_trigger",
    "definition": "CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  obj record;\nBEGIN\n  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()\n  LOOP\n    IF obj.object_type IN (\n      'schema'\n    , 'table'\n    , 'foreign table'\n    , 'view'\n    , 'materialized view'\n    , 'function'\n    , 'trigger'\n    , 'type'\n    , 'rule'\n    )\n    AND obj.is_temporary IS false -- no pg_temp objects\n    THEN\n      NOTIFY pgrst, 'reload schema';\n    END IF;\n  END LOOP;\nEND; $function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "set_graphql_placeholder",
    "arguments": "",
    "return_type": "event_trigger",
    "definition": "CREATE OR REPLACE FUNCTION extensions.set_graphql_placeholder()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\n    DECLARE\n    graphql_is_dropped bool;\n    BEGIN\n    graphql_is_dropped = (\n        SELECT ev.schema_name = 'graphql_public'\n        FROM pg_event_trigger_dropped_objects() AS ev\n        WHERE ev.schema_name = 'graphql_public'\n    );\n\n    IF graphql_is_dropped\n    THEN\n        create or replace function graphql_public.graphql(\n            \"operationName\" text default null,\n            query text default null,\n            variables jsonb default null,\n            extensions jsonb default null\n        )\n            returns jsonb\n            language plpgsql\n        as $$\n            DECLARE\n                server_version float;\n            BEGIN\n                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);\n\n                IF server_version >= 14 THEN\n                    RETURN jsonb_build_object(\n                        'errors', jsonb_build_array(\n                            jsonb_build_object(\n                                'message', 'pg_graphql extension is not enabled.'\n                            )\n                        )\n                    );\n                ELSE\n                    RETURN jsonb_build_object(\n                        'errors', jsonb_build_array(\n                            jsonb_build_object(\n                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'\n                            )\n                        )\n                    );\n                END IF;\n            END;\n        $$;\n    END IF;\n\n    END;\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v1",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v1mc",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1mc()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v3",
    "arguments": "namespace uuid, name text",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v3(namespace uuid, name text)\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v4",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v5",
    "arguments": "namespace uuid, name text",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v5(namespace uuid, name text)\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_nil",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_nil()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_nil$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_ns_dns",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_dns()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_ns_oid",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_oid()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_ns_url",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_url()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_url$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_ns_x500",
    "arguments": "",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_x500()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "_internal_resolve",
    "arguments": "query text, variables jsonb, \"operationName\" text, extensions jsonb",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION graphql._internal_resolve(query text, variables jsonb DEFAULT '{}'::jsonb, \"operationName\" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE c\nAS '$libdir/pg_graphql', $function$resolve_wrapper$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "comment_directive",
    "arguments": "comment_ text",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION graphql.comment_directive(comment_ text)\n RETURNS jsonb\n LANGUAGE sql\n IMMUTABLE\nAS $function$\n    /*\n    comment on column public.account.name is '@graphql.name: myField'\n    */\n    select\n        coalesce(\n            (\n                regexp_match(\n                    comment_,\n                    '@graphql\\((.+)\\)'\n                )\n            )[1]::jsonb,\n            jsonb_build_object()\n        )\n$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "exception",
    "arguments": "message text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION graphql.exception(message text)\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\nbegin\n    raise exception using errcode='22000', message=message;\nend;\n$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "get_schema_version",
    "arguments": "",
    "return_type": "integer",
    "definition": "CREATE OR REPLACE FUNCTION graphql.get_schema_version()\n RETURNS integer\n LANGUAGE sql\n SECURITY DEFINER\nAS $function$\n    select last_value from graphql.seq_schema_version;\n$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "increment_schema_version",
    "arguments": "",
    "return_type": "event_trigger",
    "definition": "CREATE OR REPLACE FUNCTION graphql.increment_schema_version()\n RETURNS event_trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nbegin\n    perform pg_catalog.nextval('graphql.seq_schema_version');\nend;\n$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "resolve",
    "arguments": "query text, variables jsonb, \"operationName\" text, extensions jsonb",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION graphql.resolve(query text, variables jsonb DEFAULT '{}'::jsonb, \"operationName\" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\ndeclare\n    res jsonb;\n    message_text text;\nbegin\n  begin\n    select graphql._internal_resolve(\"query\" := \"query\",\n                                     \"variables\" := \"variables\",\n                                     \"operationName\" := \"operationName\",\n                                     \"extensions\" := \"extensions\") into res;\n    return res;\n  exception\n    when others then\n    get stacked diagnostics message_text = message_text;\n    return\n    jsonb_build_object('data', null,\n                       'errors', jsonb_build_array(jsonb_build_object('message', message_text)));\n  end;\nend;\n$function$\n"
  },
  {
    "schema": "graphql_public",
    "function_name": "graphql",
    "arguments": "\"operationName\" text, query text, variables jsonb, extensions jsonb",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION graphql_public.graphql(\"operationName\" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE sql\nAS $function$\n            select graphql.resolve(\n                query := query,\n                variables := coalesce(variables, '{}'),\n                \"operationName\" := \"operationName\",\n                extensions := extensions\n            );\n        $function$\n"
  },
  {
    "schema": "pgbouncer",
    "function_name": "get_auth",
    "arguments": "p_usename text",
    "return_type": "TABLE(username text, password text)",
    "definition": "CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)\n RETURNS TABLE(username text, password text)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nbegin\n    raise debug 'PgBouncer auth request: %', p_usename;\n\n    return query\n    select \n        rolname::text, \n        case when rolvaliduntil < now() \n            then null \n            else rolpassword::text \n        end \n    from pg_authid \n    where rolname=$1 and rolcanlogin;\nend;\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "add_chat_participant",
    "arguments": "p_room_id uuid, p_user_id uuid, p_role text, p_invited_by uuid",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.add_chat_participant(p_room_id uuid, p_user_id uuid, p_role text DEFAULT 'vendor'::text, p_invited_by uuid DEFAULT NULL::uuid)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    user_name TEXT;\r\n    inviter_name TEXT;\r\nBEGIN\r\n    -- Get user name\r\n    SELECT name INTO user_name FROM users WHERE id = p_user_id;\r\n    \r\n    -- Insert participant\r\n    INSERT INTO chat_participants (\r\n        room_id,\r\n        user_id,\r\n        role,\r\n        permissions\r\n    ) VALUES (\r\n        p_room_id,\r\n        p_user_id,\r\n        p_role,\r\n        CASE p_role\r\n            WHEN 'purchaser' THEN jsonb_build_object(\r\n                'can_invite', true,\r\n                'can_share_files', true,\r\n                'can_mention_all', true,\r\n                'can_change_subject', true,\r\n                'can_archive', true\r\n            )\r\n            WHEN 'admin' THEN jsonb_build_object(\r\n                'can_invite', true,\r\n                'can_share_files', true,\r\n                'can_mention_all', true,\r\n                'can_change_subject', true,\r\n                'can_archive', true\r\n            )\r\n            ELSE jsonb_build_object(\r\n                'can_invite', false,\r\n                'can_share_files', true,\r\n                'can_mention_all', false,\r\n                'can_change_subject', false,\r\n                'can_archive', false\r\n            )\r\n        END\r\n    );\r\n    \r\n    -- Create system message\r\n    IF p_invited_by IS NOT NULL THEN\r\n        SELECT name INTO inviter_name FROM users WHERE id = p_invited_by;\r\n        INSERT INTO chat_messages (\r\n            room_id,\r\n            sender_id,\r\n            message_text,\r\n            message_type,\r\n            metadata\r\n        ) VALUES (\r\n            p_room_id,\r\n            NULL,\r\n            COALESCE(user_name, 'User') || ' was invited by ' || COALESCE(inviter_name, 'Unknown'),\r\n            'system',\r\n            jsonb_build_object('system_type', 'participant_invited')\r\n        );\r\n    ELSE\r\n        INSERT INTO chat_messages (\r\n            room_id,\r\n            sender_id,\r\n            message_text,\r\n            message_type,\r\n            metadata\r\n        ) VALUES (\r\n            p_room_id,\r\n            NULL,\r\n            COALESCE(user_name, 'User') || ' joined the conversation',\r\n            'system',\r\n            jsonb_build_object('system_type', 'participant_joined')\r\n        );\r\n    END IF;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "add_creator_as_participant",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.add_creator_as_participant()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    INSERT INTO chat_participants (room_id, user_id, role)\r\n    VALUES (NEW.id, NEW.created_by, 'admin')\r\n    ON CONFLICT (room_id, user_id) DO NOTHING;\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "add_journal_entry_line",
    "arguments": "journal_entry_id_param uuid, account_id_param uuid, debit_amount_param numeric, credit_amount_param numeric, description_param text",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.add_journal_entry_line(journal_entry_id_param uuid, account_id_param uuid, debit_amount_param numeric DEFAULT 0, credit_amount_param numeric DEFAULT 0, description_param text DEFAULT NULL::text)\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    line_id UUID;\r\nBEGIN\r\n    -- Insert journal entry line\r\n    INSERT INTO journal_entry_lines (\r\n        journal_entry_id,\r\n        account_id,\r\n        debit_amount,\r\n        credit_amount,\r\n        description\r\n    ) VALUES (\r\n        journal_entry_id_param,\r\n        account_id_param,\r\n        debit_amount_param,\r\n        credit_amount_param,\r\n        description_param\r\n    ) RETURNING id INTO line_id;\r\n    \r\n    -- Update journal entry totals\r\n    UPDATE journal_entries \r\n    SET \r\n        total_debit = (\r\n            SELECT COALESCE(SUM(debit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = journal_entry_id_param\r\n        ),\r\n        total_credit = (\r\n            SELECT COALESCE(SUM(credit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = journal_entry_id_param\r\n        )\r\n    WHERE id = journal_entry_id_param;\r\n    \r\n    RETURN line_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "adjust_inventory",
    "arguments": "product_id_in uuid, adjustment_quantity integer",
    "return_type": "integer",
    "definition": "CREATE OR REPLACE FUNCTION public.adjust_inventory(product_id_in uuid, adjustment_quantity integer)\n RETURNS integer\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n  new_quantity int;\r\nBEGIN\r\n  UPDATE inventory_items\r\n  SET quantity = GREATEST(0, quantity + adjustment_quantity) -- GREATEST prevents stock from going below zero\r\n  WHERE product_id = product_id_in\r\n  RETURNING quantity INTO new_quantity;\r\n\r\n  IF NOT FOUND THEN\r\n    RAISE EXCEPTION 'Inventory record not found for product_id %', product_id_in;\r\n  END IF;\r\n\r\n  RETURN new_quantity;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "apply_stock_adjustment",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.apply_stock_adjustment()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  UPDATE inventory_items\r\n  SET quantity = NEW.quantity_after,\r\n      updated_at = NOW()\r\n  WHERE id = NEW.inventory_item_id;\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "batch_inventory_count",
    "arguments": "p_count_data jsonb, p_reason text, p_notes text, p_adjusted_by uuid",
    "return_type": "integer",
    "definition": "CREATE OR REPLACE FUNCTION public.batch_inventory_count(p_count_data jsonb, p_reason text DEFAULT 'Batch inventory count'::text, p_notes text DEFAULT 'Physical count reconciliation'::text, p_adjusted_by uuid DEFAULT NULL::uuid)\n RETURNS integer\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\nDECLARE\r\n  item_data jsonb;\r\n  current_qty INTEGER;\r\n  new_qty     INTEGER;\r\n  adjustments_made INTEGER := 0;\r\nBEGIN\r\n  FOR item_data IN SELECT * FROM jsonb_array_elements(p_count_data)\r\n  LOOP\r\n    SELECT (item_data->>'counted_quantity')::integer INTO new_qty;\r\n\r\n    SELECT quantity INTO current_qty\r\n    FROM inventory_items\r\n    WHERE id = (item_data->>'inventory_item_id')::uuid;\r\n\r\n    IF current_qty IS NOT NULL AND current_qty <> new_qty THEN\r\n      INSERT INTO stock_adjustments (\r\n        inventory_item_id, adjustment_type, quantity_before, quantity_after,\r\n        reason, notes, adjusted_by\r\n      ) VALUES (\r\n        (item_data->>'inventory_item_id')::uuid,\r\n        'count',\r\n        current_qty,\r\n        new_qty,\r\n        p_reason,\r\n        p_notes,\r\n        COALESCE(p_adjusted_by, auth.uid())\r\n      );\r\n\r\n      adjustments_made := adjustments_made + 1;\r\n    END IF;\r\n  END LOOP;\r\n\r\n  RETURN adjustments_made;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "bulk_update_product_prices",
    "arguments": "updates jsonb",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.bulk_update_product_prices(updates jsonb)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  WITH updates_data AS (\r\n    SELECT\r\n      (value->>'id')::uuid AS product_id,\r\n      (value->>'price')::numeric AS new_price\r\n    FROM jsonb_array_elements(updates)\r\n  )\r\n  UPDATE products p\r\n  SET price = ud.new_price\r\n  FROM updates_data ud\r\n  WHERE p.id = ud.product_id\r\n    AND EXISTS (SELECT 1 FROM products WHERE id = ud.product_id); -- 👈 ensures only valid rows are updated\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "calculate_account_balance",
    "arguments": "account_id_param uuid",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_account_balance(account_id_param uuid)\n RETURNS numeric\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    opening_balance NUMERIC := 0;\r\n    current_balance NUMERIC := 0;\r\n    normal_balance_type TEXT;\r\nBEGIN\r\n    -- Get account normal balance type\r\n    SELECT normal_balance INTO normal_balance_type\r\n    FROM chart_of_accounts \r\n    WHERE id = account_id_param;\r\n    \r\n    -- Get opening balance\r\n    SELECT COALESCE(debit_amount - credit_amount, 0) INTO opening_balance\r\n    FROM opening_balances \r\n    WHERE account_id = account_id_param;\r\n    \r\n    -- Calculate current balance from general ledger\r\n    IF normal_balance_type = 'DEBIT' THEN\r\n        SELECT opening_balance + COALESCE(SUM(debit_amount - credit_amount), 0) INTO current_balance\r\n        FROM general_ledger \r\n        WHERE account_id = account_id_param;\r\n    ELSE\r\n        SELECT opening_balance + COALESCE(SUM(credit_amount - debit_amount), 0) INTO current_balance\r\n        FROM general_ledger \r\n        WHERE account_id = account_id_param;\r\n    END IF;\r\n    \r\n    RETURN COALESCE(current_balance, 0);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "calculate_bajaj_finance_charges",
    "arguments": "bill_amount numeric, processing_fee_rate numeric, convenience_charges numeric",
    "return_type": "TABLE(processing_fee_amount numeric, total_customer_payment numeric, merchant_receivable numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_bajaj_finance_charges(bill_amount numeric, processing_fee_rate numeric DEFAULT 8.00, convenience_charges numeric DEFAULT 0)\n RETURNS TABLE(processing_fee_amount numeric, total_customer_payment numeric, merchant_receivable numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN QUERY SELECT\r\n        ROUND((bill_amount * processing_fee_rate / 100), 2) as processing_fee_amount,\r\n        ROUND((bill_amount + (bill_amount * processing_fee_rate / 100) + convenience_charges), 2) as total_customer_payment,\r\n        bill_amount as merchant_receivable; -- Merchant gets the original bill amount\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "calculate_custom_product_cost_price",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_custom_product_cost_price()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- If cost_price is null but price (MRP) is set, calculate cost_price\r\n    -- Using a default margin of 30% (cost = 70% of MRP)\r\n    IF NEW.cost_price IS NULL AND NEW.price IS NOT NULL AND NEW.price > 0 THEN\r\n        NEW.cost_price := ROUND(NEW.price * 0.70, 2);  -- 30% margin\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "calculate_delivery_completion",
    "arguments": "delivery_uuid uuid",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_delivery_completion(delivery_uuid uuid)\n RETURNS numeric\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n  total_items INTEGER;\r\n  delivered_items INTEGER;\r\n  completion_rate DECIMAL(5,2);\r\nBEGIN\r\n  -- Count total items in the delivery\r\n  SELECT COUNT(*) INTO total_items\r\n  FROM delivery_items\r\n  WHERE delivery_id = delivery_uuid;\r\n  \r\n  -- Count delivered items (using existing item_status column)\r\n  SELECT COUNT(*) INTO delivered_items\r\n  FROM delivery_items\r\n  WHERE delivery_id = delivery_uuid AND item_status = 'delivered';\r\n  \r\n  -- Calculate completion rate\r\n  IF total_items > 0 THEN\r\n    completion_rate = (delivered_items::DECIMAL / total_items::DECIMAL) * 100;\r\n  ELSE\r\n    completion_rate = 0;\r\n  END IF;\r\n  \r\n  RETURN completion_rate;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "calculate_distance",
    "arguments": "lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)\n RETURNS numeric\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN (6371 * acos(\r\n    cos(radians(lat1)) * cos(radians(lat2)) * \r\n    cos(radians(lng2) - radians(lng1)) + \r\n    sin(radians(lat1)) * sin(radians(lat2))\r\n  ));\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "calculate_distance_km",
    "arguments": "lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_distance_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)\n RETURNS numeric\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\r\nBEGIN\r\n    -- Handle null inputs\r\n    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN\r\n        RETURN NULL;\r\n    END IF;\r\n    \r\n    -- Haversine formula for calculating distance\r\n    RETURN (\r\n        6371 * acos(\r\n            cos(radians(lat1)) * cos(radians(lat2)) * \r\n            cos(radians(lon2) - radians(lon1)) + \r\n            sin(radians(lat1)) * sin(radians(lat2))\r\n        )\r\n    );\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        RETURN NULL;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "calculate_sales_order_item_tax",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.calculate_sales_order_item_tax()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    item_tax_percentage DECIMAL(5,2);\r\nBEGIN\r\n    -- Get tax percentage from parent sales order or use item's own tax percentage\r\n    SELECT COALESCE(so.tax_percentage, NEW.tax_percentage, 18.00)\r\n    INTO item_tax_percentage\r\n    FROM sales_orders so\r\n    WHERE so.id = NEW.order_id;\r\n    \r\n    -- Calculate tax for this item\r\n    NEW.tax_percentage := item_tax_percentage;\r\n    NEW.taxable_amount := NEW.quantity * NEW.final_price;\r\n    NEW.tax_amount := ROUND(NEW.taxable_amount * item_tax_percentage / 100, 2);\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_audit_trail",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.create_audit_trail()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_delivery_clusters",
    "arguments": "p_session_id uuid, p_max_radius_km numeric",
    "return_type": "integer",
    "definition": "CREATE OR REPLACE FUNCTION public.create_delivery_clusters(p_session_id uuid, p_max_radius_km numeric DEFAULT 5.0)\n RETURNS integer\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    v_cluster_count integer := 0;\r\n    v_delivery_record RECORD;\r\n    v_cluster_id uuid;\r\n    v_center_lat numeric;\r\n    v_center_lon numeric;\r\nBEGIN\r\n    -- Simple clustering algorithm - group nearby deliveries\r\n    FOR v_delivery_record IN \r\n        SELECT d.*, COUNT(di.id) as item_count\r\n        FROM deliveries d\r\n        LEFT JOIN delivery_items di ON d.id = di.delivery_id\r\n        WHERE d.status = 'pending' \r\n        AND d.latitude IS NOT NULL \r\n        AND d.longitude IS NOT NULL\r\n        AND d.route_id IS NULL\r\n        GROUP BY d.id\r\n        ORDER BY d.latitude, d.longitude\r\n    LOOP\r\n        -- Find existing cluster within radius\r\n        SELECT id, center_latitude, center_longitude INTO v_cluster_id, v_center_lat, v_center_lon\r\n        FROM delivery_clusters dc\r\n        WHERE dc.optimization_session_id = p_session_id\r\n        AND calculate_distance_km(\r\n            dc.center_latitude, dc.center_longitude,\r\n            v_delivery_record.latitude, v_delivery_record.longitude\r\n        ) <= p_max_radius_km\r\n        LIMIT 1;\r\n        \r\n        -- Create new cluster if none found\r\n        IF v_cluster_id IS NULL THEN\r\n            v_cluster_count := v_cluster_count + 1;\r\n            \r\n            INSERT INTO delivery_clusters (\r\n                optimization_session_id,\r\n                cluster_number,\r\n                center_latitude,\r\n                center_longitude,\r\n                radius_km,\r\n                total_deliveries\r\n            ) VALUES (\r\n                p_session_id,\r\n                v_cluster_count,\r\n                v_delivery_record.latitude,\r\n                v_delivery_record.longitude,\r\n                p_max_radius_km,\r\n                1\r\n            ) RETURNING id INTO v_cluster_id;\r\n        ELSE\r\n            -- Update existing cluster\r\n            UPDATE delivery_clusters\r\n            SET total_deliveries = total_deliveries + 1\r\n            WHERE id = v_cluster_id;\r\n        END IF;\r\n        \r\n        -- Assign delivery to cluster\r\n        INSERT INTO delivery_cluster_assignments (\r\n            delivery_id,\r\n            cluster_id,\r\n            distance_from_center_km\r\n        ) VALUES (\r\n            v_delivery_record.id,\r\n            v_cluster_id,\r\n            COALESCE(calculate_distance_km(\r\n                v_center_lat, v_center_lon,\r\n                v_delivery_record.latitude, v_delivery_record.longitude\r\n            ), 0)\r\n        ) ON CONFLICT (delivery_id, cluster_id) DO NOTHING;\r\n        \r\n    END LOOP;\r\n    \r\n    RETURN v_cluster_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_delivery_items_from_sales_order",
    "arguments": "p_delivery_id uuid, p_sales_order_id uuid, p_created_by uuid",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.create_delivery_items_from_sales_order(p_delivery_id uuid, p_sales_order_id uuid, p_created_by uuid DEFAULT NULL::uuid)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  INSERT INTO public.delivery_items (\r\n    delivery_id,\r\n    sales_order_item_id,\r\n    product_id,\r\n    custom_product_id,\r\n    item_name,\r\n    quantity_to_deliver,\r\n    unit_price,\r\n    item_description,\r\n    item_image_url,\r\n    item_sku,\r\n    item_category,\r\n    customer_id,\r\n    customer_name,\r\n    delivery_address,\r\n    customer_phone,\r\n    delivery_sequence,\r\n    created_by\r\n  )\r\n  SELECT \r\n    p_delivery_id,\r\n    soi.id,\r\n    soi.product_id,\r\n    soi.custom_product_id,\r\n    COALESCE(soi.name, p.name, cp.name, 'Unknown Item'),\r\n    soi.quantity,\r\n    soi.unit_price,\r\n    COALESCE(p.description, cp.description, ''),\r\n    COALESCE(p.image_url, cp.config_schema->>'image_url', ''),\r\n    p.sku,\r\n    p.category,\r\n    so.customer_id,\r\n    c.name,\r\n    so.address,\r\n    c.phone,\r\n    ROW_NUMBER() OVER (ORDER BY soi.id),\r\n    p_created_by\r\n  FROM public.sales_order_items soi\r\n  JOIN public.sales_orders so ON soi.order_id = so.id\r\n  LEFT JOIN public.products p ON soi.product_id = p.id\r\n  LEFT JOIN public.custom_products cp ON soi.custom_product_id = cp.id\r\n  LEFT JOIN public.customers c ON so.customer_id = c.id\r\n  WHERE so.id = p_sales_order_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_delivery_safe",
    "arguments": "p_sales_order_id uuid, p_status character varying, p_delivery_type character varying, p_delivery_address text, p_customer_name character varying, p_customer_phone character varying, p_total_items integer, p_estimated_value numeric, p_delivery_notes text, p_created_by uuid",
    "return_type": "TABLE(id uuid, sales_order_id uuid, status character varying, delivery_type character varying, delivery_address text, customer_name character varying, customer_phone character varying, total_items integer, estimated_value numeric, delivery_notes text, created_by uuid, created_at timestamp with time zone)",
    "definition": "CREATE OR REPLACE FUNCTION public.create_delivery_safe(p_sales_order_id uuid, p_status character varying DEFAULT 'pending'::character varying, p_delivery_type character varying DEFAULT 'standard'::character varying, p_delivery_address text DEFAULT NULL::text, p_customer_name character varying DEFAULT NULL::character varying, p_customer_phone character varying DEFAULT NULL::character varying, p_total_items integer DEFAULT NULL::integer, p_estimated_value numeric DEFAULT NULL::numeric, p_delivery_notes text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)\n RETURNS TABLE(id uuid, sales_order_id uuid, status character varying, delivery_type character varying, delivery_address text, customer_name character varying, customer_phone character varying, total_items integer, estimated_value numeric, delivery_notes text, created_by uuid, created_at timestamp with time zone)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n  new_delivery_id UUID;\r\nBEGIN\r\n  -- Insert the delivery record with explicit column specification\r\n  INSERT INTO deliveries (\r\n    sales_order_id,\r\n    status,\r\n    delivery_type,\r\n    delivery_address,\r\n    customer_name,\r\n    customer_phone,\r\n    total_items,\r\n    estimated_value,\r\n    delivery_notes,\r\n    created_by\r\n  ) VALUES (\r\n    p_sales_order_id,\r\n    p_status,\r\n    p_delivery_type,\r\n    p_delivery_address,\r\n    p_customer_name,\r\n    p_customer_phone,\r\n    p_total_items,\r\n    p_estimated_value,\r\n    p_delivery_notes,\r\n    p_created_by\r\n  ) RETURNING deliveries.id INTO new_delivery_id;\r\n\r\n  -- Return the created delivery\r\n  RETURN QUERY\r\n  SELECT \r\n    d.id,\r\n    d.sales_order_id,\r\n    d.status,\r\n    d.delivery_type,\r\n    d.delivery_address,\r\n    d.customer_name,\r\n    d.customer_phone,\r\n    d.total_items,\r\n    d.estimated_value,\r\n    d.delivery_notes,\r\n    d.created_by,\r\n    d.created_at\r\n  FROM deliveries d\r\n  WHERE d.id = new_delivery_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_employee_group_chat",
    "arguments": "p_subject text, p_created_by uuid",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_employee_group_chat(p_subject text DEFAULT 'All Staff Group Chat'::text, p_created_by uuid DEFAULT NULL::uuid)\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    room_id UUID;\r\n    employee_id UUID;\r\nBEGIN\r\n    -- Create room\r\n    INSERT INTO chat_rooms (\r\n        type,\r\n        subject,\r\n        created_by,\r\n        metadata\r\n    ) VALUES (\r\n        'employee_group',\r\n        p_subject,\r\n        p_created_by,\r\n        jsonb_build_object(\r\n            'group_type', 'all_staff',\r\n            'auto_add_new_employees', true\r\n        )\r\n    ) RETURNING id INTO room_id;\r\n    \r\n    -- Add all employees as participants\r\n    FOR employee_id IN \r\n        SELECT id FROM users WHERE id IS NOT NULL\r\n    LOOP\r\n        INSERT INTO chat_participants (\r\n            room_id,\r\n            user_id,\r\n            role,\r\n            permissions\r\n        ) VALUES (\r\n            room_id,\r\n            employee_id,\r\n            'employee',\r\n            jsonb_build_object(\r\n                'can_invite', false,\r\n                'can_share_files', true,\r\n                'can_mention_all', false,\r\n                'can_change_subject', false,\r\n                'can_archive', false\r\n            )\r\n        );\r\n    END LOOP;\r\n    \r\n    -- Create initial system message\r\n    INSERT INTO chat_messages (\r\n        room_id,\r\n        sender_id,\r\n        message_text,\r\n        message_type,\r\n        metadata\r\n    ) VALUES (\r\n        room_id,\r\n        NULL,\r\n        'All staff group chat created for company-wide communications',\r\n        'system',\r\n        jsonb_build_object('system_type', 'group_created')\r\n    );\r\n    \r\n    RETURN room_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_employee_personal_chat",
    "arguments": "p_user1_id uuid, p_user2_id uuid, p_subject text",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_employee_personal_chat(p_user1_id uuid, p_user2_id uuid, p_subject text DEFAULT NULL::text)\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    room_id UUID;\r\n    user1_name TEXT;\r\n    user2_name TEXT;\r\nBEGIN\r\n    -- Get user names\r\n    SELECT name INTO user1_name FROM users WHERE id = p_user1_id;\r\n    SELECT name INTO user2_name FROM users WHERE id = p_user2_id;\r\n    \r\n    -- Create room\r\n    INSERT INTO chat_rooms (\r\n        type,\r\n        subject,\r\n        created_by,\r\n        metadata\r\n    ) VALUES (\r\n        'employee_personal',\r\n        COALESCE(p_subject, 'Chat: ' || COALESCE(user1_name, 'User') || ' & ' || COALESCE(user2_name, 'User')),\r\n        p_user1_id,\r\n        jsonb_build_object(\r\n            'chat_type', 'personal',\r\n            'participants', array[p_user1_id, p_user2_id]\r\n        )\r\n    ) RETURNING id INTO room_id;\r\n    \r\n    -- Add both participants\r\n    INSERT INTO chat_participants (room_id, user_id, role, permissions) VALUES\r\n        (room_id, p_user1_id, 'employee', jsonb_build_object('can_invite', false, 'can_share_files', true, 'can_mention_all', false, 'can_change_subject', true, 'can_archive', true)),\r\n        (room_id, p_user2_id, 'employee', jsonb_build_object('can_invite', false, 'can_share_files', true, 'can_mention_all', false, 'can_change_subject', true, 'can_archive', true));\r\n    \r\n    RETURN room_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_general_ledger_entries",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.create_general_ledger_entries()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n  line_rec RECORD;\r\n  running_balance NUMERIC(15,2);\r\nBEGIN\r\n  -- Only process when status changes to 'POSTED'\r\n  IF NEW.status = 'POSTED' AND (OLD.status IS NULL OR OLD.status != 'POSTED') THEN\r\n    \r\n    -- Process each journal entry line\r\n    FOR line_rec IN \r\n      SELECT * FROM journal_entry_lines \r\n      WHERE journal_entry_id = NEW.id \r\n      ORDER BY line_number\r\n    LOOP\r\n      -- Calculate running balance for the account\r\n      SELECT COALESCE(\r\n        (SELECT running_balance FROM general_ledger \r\n         WHERE account_id = line_rec.account_id \r\n         ORDER BY created_at DESC, id DESC \r\n         LIMIT 1), \r\n        (SELECT opening_balance FROM chart_of_accounts WHERE id = line_rec.account_id)\r\n      ) INTO running_balance;\r\n      \r\n      -- Update running balance\r\n      running_balance := running_balance + line_rec.debit_amount - line_rec.credit_amount;\r\n      \r\n      -- Insert into general ledger\r\n      INSERT INTO general_ledger (\r\n        account_id,\r\n        journal_entry_id,\r\n        journal_line_id,\r\n        transaction_date,\r\n        posting_date,\r\n        description,\r\n        reference,\r\n        debit_amount,\r\n        credit_amount,\r\n        running_balance,\r\n        source_document_type,\r\n        source_document_id\r\n      ) VALUES (\r\n        line_rec.account_id,\r\n        NEW.id,\r\n        line_rec.id,\r\n        NEW.entry_date,\r\n        NEW.posting_date,\r\n        line_rec.description,\r\n        NEW.reference_number,\r\n        line_rec.debit_amount,\r\n        line_rec.credit_amount,\r\n        running_balance,\r\n        NEW.source_document_type,\r\n        NEW.source_document_id\r\n      );\r\n    END LOOP;\r\n    \r\n    -- Update posting timestamp\r\n    UPDATE journal_entries \r\n    SET posted_at = NOW() \r\n    WHERE id = NEW.id;\r\n  END IF;\r\n  \r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_journal_entry",
    "arguments": "entry_date_param date, description_param text, reference_param text, created_by_param uuid",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_journal_entry(entry_date_param date, description_param text, reference_param text DEFAULT NULL::text, created_by_param uuid DEFAULT NULL::uuid)\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    journal_id UUID;\r\n    journal_number_val TEXT;\r\nBEGIN\r\n    -- Generate journal number\r\n    SELECT 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((\r\n        SELECT COALESCE(MAX(CAST(SUBSTRING(journal_number FROM 'JE-[0-9]+-([0-9]+)') AS INTEGER)), 0) + 1\r\n        FROM journal_entries \r\n        WHERE journal_number ~ '^JE-[0-9]+-[0-9]+$'\r\n        AND entry_date = entry_date_param\r\n    )::TEXT, 4, '0') INTO journal_number_val;\r\n    \r\n    -- Create journal entry\r\n    INSERT INTO journal_entries (\r\n        journal_number,\r\n        entry_date,\r\n        description,\r\n        reference_number,\r\n        created_by,\r\n        status\r\n    ) VALUES (\r\n        journal_number_val,\r\n        entry_date_param,\r\n        description_param,\r\n        reference_param,\r\n        created_by_param,\r\n        'DRAFT'::journal_status\r\n    ) RETURNING id INTO journal_id;\r\n    \r\n    RETURN journal_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_journal_entry",
    "arguments": "p_entry_date date, p_description text, p_reference text",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_journal_entry(p_entry_date date, p_description text, p_reference text)\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    journal_id UUID;\r\n    next_journal_number TEXT;\r\n    system_user_id UUID;\r\nBEGIN\r\n    -- Get system user ID (use the first admin user or create a system user)\r\n    SELECT id INTO system_user_id FROM users WHERE role = 'admin' LIMIT 1;\r\n    \r\n    -- If no admin user found, try to get any user\r\n    IF system_user_id IS NULL THEN\r\n        SELECT id INTO system_user_id FROM users LIMIT 1;\r\n    END IF;\r\n    \r\n    -- If still no user, we'll need to handle this gracefully\r\n    IF system_user_id IS NULL THEN\r\n        RAISE WARNING 'No users found in system. Creating journal entry without user reference.';\r\n        -- We'll still create the entry but it will need manual assignment later\r\n    END IF;\r\n    \r\n    -- Generate next journal number\r\n    SELECT COALESCE(MAX(journal_number::INTEGER), 0) + 1 \r\n    INTO next_journal_number \r\n    FROM journal_entries \r\n    WHERE journal_number ~ '^[0-9]+$';\r\n    \r\n    -- Default to 1 if no previous entries\r\n    IF next_journal_number IS NULL THEN\r\n        next_journal_number := '1';\r\n    END IF;\r\n    \r\n    -- Create journal entry\r\n    INSERT INTO journal_entries (\r\n        journal_number,\r\n        entry_date,\r\n        description,\r\n        reference_number,\r\n        status,\r\n        total_debit,\r\n        total_credit,\r\n        created_by\r\n    ) VALUES (\r\n        LPAD(next_journal_number, 6, '0'),\r\n        p_entry_date,\r\n        p_description,\r\n        p_reference,\r\n        'DRAFT',\r\n        0,\r\n        0,\r\n        system_user_id\r\n    ) RETURNING id INTO journal_id;\r\n    \r\n    RETURN journal_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_message_notifications",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.create_message_notifications()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Create notifications for all participants except the sender\r\n    INSERT INTO chat_notifications (user_id, room_id, message_id, type)\r\n    SELECT \r\n        cp.user_id,\r\n        NEW.room_id,\r\n        NEW.id,\r\n        'message'\r\n    FROM chat_participants cp\r\n    WHERE cp.room_id = NEW.room_id \r\n    AND cp.user_id != NEW.sender_id\r\n    AND cp.is_active = true;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_po_chat_room",
    "arguments": "p_purchase_order_id uuid, p_subject text, p_participant_ids uuid[]",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_po_chat_room(p_purchase_order_id uuid, p_subject text DEFAULT NULL::text, p_participant_ids uuid[] DEFAULT ARRAY[]::uuid[])\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    room_id UUID;\r\n    participant_id UUID;\r\n    po_record RECORD;\r\nBEGIN\r\n    -- Get PO details\r\n    SELECT * INTO po_record FROM purchase_orders WHERE id = p_purchase_order_id;\r\n    \r\n    -- Create room with default subject if none provided\r\n    INSERT INTO chat_rooms (\r\n        purchase_order_id,\r\n        type,\r\n        subject,\r\n        created_by,\r\n        metadata\r\n    ) VALUES (\r\n        p_purchase_order_id,\r\n        'purchase_order',\r\n        COALESCE(p_subject, 'PO #' || RIGHT(p_purchase_order_id::text, 8) || ' - ' || COALESCE(po_record.product_name, 'Custom Product')),\r\n        po_record.created_by,\r\n        jsonb_build_object(\r\n            'po_reference', RIGHT(p_purchase_order_id::text, 8),\r\n            'priority', CASE WHEN po_record.total > 100000 THEN 'high' ELSE 'medium' END,\r\n            'auto_created', true\r\n        )\r\n    ) RETURNING id INTO room_id;\r\n    \r\n    -- Add participants\r\n    FOREACH participant_id IN ARRAY p_participant_ids\r\n    LOOP\r\n        INSERT INTO chat_participants (\r\n            room_id,\r\n            user_id,\r\n            role,\r\n            permissions\r\n        ) VALUES (\r\n            room_id,\r\n            participant_id,\r\n            'vendor', -- Default role, should be updated based on user's actual role\r\n            jsonb_build_object(\r\n                'can_invite', false,\r\n                'can_share_files', true,\r\n                'can_mention_all', false,\r\n                'can_change_subject', false,\r\n                'can_archive', false\r\n            )\r\n        );\r\n    END LOOP;\r\n    \r\n    -- Create initial system message\r\n    INSERT INTO chat_messages (\r\n        room_id,\r\n        sender_id,\r\n        message_text,\r\n        message_type,\r\n        metadata\r\n    ) VALUES (\r\n        room_id,\r\n        NULL,\r\n        'Chat room created for purchase order #' || RIGHT(p_purchase_order_id::text, 8),\r\n        'system',\r\n        jsonb_build_object('system_type', 'room_created')\r\n    );\r\n    \r\n    RETURN room_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_simple_delivery",
    "arguments": "p_sales_order_id uuid, p_customer_name character varying, p_customer_phone character varying, p_delivery_address text, p_created_by uuid",
    "return_type": "TABLE(id uuid, sales_order_id uuid, status character varying, customer_name character varying, customer_phone character varying, delivery_address text, created_by uuid, created_at timestamp with time zone)",
    "definition": "CREATE OR REPLACE FUNCTION public.create_simple_delivery(p_sales_order_id uuid, p_customer_name character varying DEFAULT NULL::character varying, p_customer_phone character varying DEFAULT NULL::character varying, p_delivery_address text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid)\n RETURNS TABLE(id uuid, sales_order_id uuid, status character varying, customer_name character varying, customer_phone character varying, delivery_address text, created_by uuid, created_at timestamp with time zone)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n  new_delivery_id UUID;\r\nBEGIN\r\n  -- Generate a new UUID for the delivery\r\n  new_delivery_id := gen_random_uuid();\r\n  \r\n  -- Insert the delivery record with explicit UUID and minimal fields\r\n  INSERT INTO deliveries (\r\n    id,\r\n    sales_order_id,\r\n    status,\r\n    customer_name,\r\n    customer_phone,\r\n    delivery_address,\r\n    created_by,\r\n    created_at\r\n  ) VALUES (\r\n    new_delivery_id,\r\n    p_sales_order_id,\r\n    'pending',\r\n    p_customer_name,\r\n    p_customer_phone,\r\n    p_delivery_address,\r\n    p_created_by,\r\n    NOW()\r\n  );\r\n\r\n  -- Return the created delivery\r\n  RETURN QUERY\r\n  SELECT \r\n    d.id,\r\n    d.sales_order_id,\r\n    d.status::VARCHAR,\r\n    d.customer_name,\r\n    d.customer_phone,\r\n    d.delivery_address,\r\n    d.created_by,\r\n    d.created_at\r\n  FROM deliveries d\r\n  WHERE d.id = new_delivery_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_vendor_group_chat",
    "arguments": "p_subject text, p_created_by uuid, p_vendor_ids uuid[]",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_vendor_group_chat(p_subject text DEFAULT 'Vendor Group Chat'::text, p_created_by uuid DEFAULT NULL::uuid, p_vendor_ids uuid[] DEFAULT ARRAY[]::uuid[])\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    room_id UUID;\r\n    vendor_id UUID;\r\nBEGIN\r\n    -- Create room\r\n    INSERT INTO chat_rooms (\r\n        type,\r\n        subject,\r\n        created_by,\r\n        metadata\r\n    ) VALUES (\r\n        'vendor_group',\r\n        p_subject,\r\n        p_created_by,\r\n        jsonb_build_object(\r\n            'group_type', 'vendor_coordination',\r\n            'vendor_count', array_length(p_vendor_ids, 1)\r\n        )\r\n    ) RETURNING id INTO room_id;\r\n    \r\n    -- Add vendor participants\r\n    FOREACH vendor_id IN ARRAY p_vendor_ids\r\n    LOOP\r\n        INSERT INTO chat_participants (\r\n            room_id,\r\n            user_id,\r\n            role,\r\n            permissions\r\n        ) VALUES (\r\n            room_id,\r\n            vendor_id,\r\n            'vendor',\r\n            jsonb_build_object(\r\n                'can_invite', false,\r\n                'can_share_files', true,\r\n                'can_mention_all', false,\r\n                'can_change_subject', false,\r\n                'can_archive', false\r\n            )\r\n        );\r\n    END LOOP;\r\n    \r\n    -- Add creator as admin\r\n    IF p_created_by IS NOT NULL THEN\r\n        INSERT INTO chat_participants (\r\n            room_id,\r\n            user_id,\r\n            role,\r\n            permissions\r\n        ) VALUES (\r\n            room_id,\r\n            p_created_by,\r\n            'admin',\r\n            jsonb_build_object(\r\n                'can_invite', true,\r\n                'can_share_files', true,\r\n                'can_mention_all', true,\r\n                'can_change_subject', true,\r\n                'can_archive', true\r\n            )\r\n        );\r\n    END IF;\r\n    \r\n    -- Create initial system message\r\n    INSERT INTO chat_messages (\r\n        room_id,\r\n        sender_id,\r\n        message_text,\r\n        message_type,\r\n        metadata\r\n    ) VALUES (\r\n        room_id,\r\n        NULL,\r\n        'Vendor group chat created for supplier coordination',\r\n        'system',\r\n        jsonb_build_object('system_type', 'vendor_group_created')\r\n    );\r\n    \r\n    RETURN room_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "generate_receipt_number",
    "arguments": "",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION public.generate_receipt_number()\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n  receipt_number text;\r\n  counter integer;\r\nBEGIN\r\n  receipt_number := 'GR' || to_char(now(), 'YYYYMMDD');\r\n  SELECT COUNT(*) + 1 INTO counter\r\n  FROM goods_receipts \r\n  WHERE receipt_number LIKE receipt_number || '%'\r\n  AND DATE(created_at) = CURRENT_DATE;\r\n\r\n  receipt_number := receipt_number || LPAD(counter::text, 3, '0');\r\n  RETURN receipt_number;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_account_balance_as_of_date",
    "arguments": "account_id_param uuid, as_of_date date",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.get_account_balance_as_of_date(account_id_param uuid, as_of_date date)\n RETURNS numeric\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    opening_balance NUMERIC := 0;\r\n    balance_as_of_date NUMERIC := 0;\r\n    normal_balance_type TEXT;\r\nBEGIN\r\n    -- Get account normal balance type\r\n    SELECT normal_balance INTO normal_balance_type\r\n    FROM chart_of_accounts \r\n    WHERE id = account_id_param;\r\n    \r\n    -- Get opening balance\r\n    SELECT COALESCE(debit_amount - credit_amount, 0) INTO opening_balance\r\n    FROM opening_balances \r\n    WHERE account_id = account_id_param;\r\n    \r\n    -- Calculate balance as of date\r\n    IF normal_balance_type = 'DEBIT' THEN\r\n        SELECT opening_balance + COALESCE(SUM(debit_amount - credit_amount), 0) INTO balance_as_of_date\r\n        FROM general_ledger \r\n        WHERE account_id = account_id_param \r\n        AND transaction_date <= as_of_date;\r\n    ELSE\r\n        SELECT opening_balance + COALESCE(SUM(credit_amount - debit_amount), 0) INTO balance_as_of_date\r\n        FROM general_ledger \r\n        WHERE account_id = account_id_param \r\n        AND transaction_date <= as_of_date;\r\n    END IF;\r\n    \r\n    RETURN COALESCE(balance_as_of_date, 0);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_average_on_time_delivery",
    "arguments": "",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.get_average_on_time_delivery()\n RETURNS numeric\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  -- This function is dependent on expected_delivery_date and actual_delivery_date columns.\r\n  IF EXISTS (\r\n      SELECT 1 FROM information_schema.columns\r\n      WHERE table_name = 'purchase_orders' AND column_name = 'actual_delivery_date'\r\n  ) AND EXISTS (\r\n      SELECT 1 FROM information_schema.columns\r\n      WHERE table_name = 'purchase_orders' AND column_name = 'expected_delivery_date'\r\n  ) THEN\r\n    RETURN (\r\n      SELECT\r\n        (COUNT(CASE WHEN actual_delivery_date <= expected_delivery_date THEN 1 END) * 100.0) / NULLIF(COUNT(id), 0)\r\n      FROM\r\n        public.purchase_orders\r\n      WHERE\r\n        actual_delivery_date IS NOT NULL AND expected_delivery_date IS NOT NULL\r\n    );\r\n  ELSE\r\n    RETURN 0; -- Return 0 if columns don't exist\r\n  END IF;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_average_order_value",
    "arguments": "",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.get_average_order_value()\n RETURNS numeric\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    total_sales NUMERIC;\r\n    order_count INT;\r\nBEGIN\r\n    SELECT SUM(soi.quantity * soi.unit_price), COUNT(DISTINCT so.id)\r\n    INTO total_sales, order_count\r\n    FROM public.sales_orders so\r\n    JOIN public.sales_order_items soi ON so.id = soi.order_id\r\n    WHERE so.status IN ('confirmed', 'shipped');\r\n\r\n    IF order_count = 0 THEN\r\n        RETURN 0;\r\n    END IF;\r\n\r\n    RETURN total_sales / order_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_business_alerts",
    "arguments": "",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_business_alerts()\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN jsonb_build_object(\r\n        'critical', '[]'::jsonb,\r\n        'warnings', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'type', 'low_stock',\r\n                    'message', 'Product ' || p.name || ' is running low on stock',\r\n                    'severity', 'warning',\r\n                    'data', jsonb_build_object('product_id', p.id, 'current_stock', ii.quantity, 'reorder_point', ii.reorder_point)\r\n                )\r\n            )\r\n            FROM inventory_items ii\r\n            JOIN products p ON ii.product_id = p.id\r\n            WHERE ii.quantity <= ii.reorder_point\r\n            LIMIT 10\r\n        ),\r\n        'info', '[]'::jsonb\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_business_summary",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_business_summary(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    summary JSONB;\r\nBEGIN\r\n    WITH monthly_revenue AS (\r\n        SELECT \r\n            DATE_TRUNC('month', so.created_at) as month,\r\n            COALESCE(SUM(CASE WHEN so.status::text ILIKE ANY(ARRAY['%delivered%', '%completed%', '%paid%', '%done%']) THEN so.final_price END), 0) as monthly_revenue\r\n        FROM sales_orders so\r\n        WHERE so.created_at::date BETWEEN (p_start_date - INTERVAL '12 months') AND p_end_date\r\n        GROUP BY DATE_TRUNC('month', so.created_at)\r\n    ),\r\n    business_metrics AS (\r\n        SELECT \r\n            -- Revenue metrics (using flexible status matching)\r\n            COALESCE(SUM(CASE WHEN so.status::text ILIKE ANY(ARRAY['%delivered%', '%completed%', '%paid%', '%done%']) THEN so.final_price END), 0) as total_revenue,\r\n            COALESCE(COUNT(CASE WHEN so.status::text ILIKE ANY(ARRAY['%delivered%', '%completed%', '%paid%', '%done%']) THEN 1 END), 0) as completed_orders,\r\n            COALESCE(AVG(CASE WHEN so.status::text ILIKE ANY(ARRAY['%delivered%', '%completed%', '%paid%', '%done%']) THEN so.final_price END), 0) as avg_order_value,\r\n            \r\n            -- Pipeline metrics (using flexible status matching)\r\n            COALESCE(SUM(CASE WHEN so.status::text ILIKE ANY(ARRAY['%draft%', '%pending%', '%processing%', '%progress%', '%submitted%']) AND so.status::text NOT ILIKE ANY(ARRAY['%completed%', '%delivered%', '%cancelled%']) THEN so.final_price END), 0) as pipeline_value,\r\n            COALESCE(COUNT(CASE WHEN so.status::text ILIKE ANY(ARRAY['%draft%', '%pending%', '%processing%', '%progress%', '%submitted%']) AND so.status::text NOT ILIKE ANY(ARRAY['%completed%', '%delivered%', '%cancelled%']) THEN 1 END), 0) as active_orders,\r\n            \r\n            -- Customer metrics\r\n            COUNT(DISTINCT so.customer_id) as active_customers,\r\n            \r\n            -- Growth metrics (get previous month revenue)\r\n            (SELECT monthly_revenue FROM monthly_revenue \r\n             WHERE month = DATE_TRUNC('month', p_start_date - INTERVAL '1 month') \r\n             LIMIT 1) as prev_revenue\r\n            \r\n        FROM sales_orders so\r\n        WHERE so.created_at::date BETWEEN p_start_date AND p_end_date\r\n    ),\r\n    inventory_metrics AS (\r\n        SELECT \r\n            COALESCE(SUM(ii.quantity * p.price), 0) as total_inventory_value,\r\n            COUNT(CASE WHEN ii.quantity = 0 THEN 1 END) as stockout_count,\r\n            COUNT(*) as total_products\r\n        FROM inventory_items ii\r\n        JOIN products p ON ii.product_id = p.id\r\n    ),\r\n    financial_metrics AS (\r\n        SELECT \r\n            COALESCE(SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount END), 0) as total_deposits,\r\n            COALESCE(SUM(CASE WHEN bt.type = 'withdrawal' THEN bt.amount END), 0) as total_withdrawals,\r\n            COALESCE(SUM(ba.current_balance), 0) as total_bank_balance\r\n        FROM bank_transactions bt\r\n        JOIN bank_accounts ba ON bt.bank_account_id = ba.id\r\n        WHERE bt.date BETWEEN p_start_date AND p_end_date\r\n    )\r\n    SELECT jsonb_build_object(\r\n        'revenue', jsonb_build_object(\r\n            'total', bm.total_revenue,\r\n            'growth_rate', CASE \r\n                WHEN bm.prev_revenue > 0 THEN ROUND(((bm.total_revenue - bm.prev_revenue) / bm.prev_revenue * 100)::numeric, 2)\r\n                ELSE 0 \r\n            END,\r\n            'avg_order_value', ROUND(bm.avg_order_value, 2),\r\n            'completed_orders', bm.completed_orders\r\n        ),\r\n        'pipeline', jsonb_build_object(\r\n            'value', bm.pipeline_value,\r\n            'active_orders', bm.active_orders,\r\n            'conversion_rate', CASE \r\n                WHEN (bm.completed_orders + bm.active_orders) > 0 \r\n                THEN ROUND((bm.completed_orders::numeric / (bm.completed_orders + bm.active_orders) * 100), 2)\r\n                ELSE 0 \r\n            END\r\n        ),\r\n        'customers', jsonb_build_object(\r\n            'active', bm.active_customers,\r\n            'new_this_period', (\r\n                SELECT COUNT(DISTINCT c.id) \r\n                FROM customers c \r\n                WHERE c.created_at::date BETWEEN p_start_date AND p_end_date\r\n            )\r\n        ),\r\n        'inventory', jsonb_build_object(\r\n            'total_value', im.total_inventory_value,\r\n            'stockout_rate', ROUND((im.stockout_count::numeric / im.total_products * 100), 2),\r\n            'total_products', im.total_products\r\n        ),\r\n        'financial', jsonb_build_object(\r\n            'cash_flow', fm.total_deposits - fm.total_withdrawals,\r\n            'bank_balance', fm.total_bank_balance,\r\n            'deposits', fm.total_deposits,\r\n            'withdrawals', fm.total_withdrawals\r\n        )\r\n    ) INTO summary\r\n    FROM business_metrics bm, inventory_metrics im, financial_metrics fm;\r\n    \r\n    RETURN summary;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_comprehensive_analytics",
    "arguments": "p_start_date date, p_end_date date, p_department text, p_include_forecasts boolean",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_comprehensive_analytics(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE, p_department text DEFAULT NULL::text, p_include_forecasts boolean DEFAULT true)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    result JSONB;\r\nBEGIN\r\n    SELECT jsonb_build_object(\r\n        'summary', get_business_summary(p_start_date, p_end_date),\r\n        'sales', get_sales_analytics_comprehensive(p_start_date, p_end_date),\r\n        'inventory', get_inventory_analytics_comprehensive(p_start_date, p_end_date),\r\n        'financial', get_financial_analytics_comprehensive(p_start_date, p_end_date),\r\n        'operations', get_operations_analytics_comprehensive(p_start_date, p_end_date),\r\n        'customers', get_customer_analytics_comprehensive(p_start_date, p_end_date),\r\n        'vendors', get_vendor_analytics_comprehensive(p_start_date, p_end_date),\r\n        'hr', get_hr_analytics_comprehensive(p_start_date, p_end_date),\r\n        'production', get_production_analytics_comprehensive(p_start_date, p_end_date),\r\n        'forecasts', CASE WHEN p_include_forecasts THEN get_forecasting_analytics(p_start_date, p_end_date) ELSE NULL END,\r\n        'alerts', get_business_alerts(),\r\n        'generated_at', NOW()\r\n    ) INTO result;\r\n    \r\n    RETURN result;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_customer_analytics_comprehensive",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_customer_analytics_comprehensive(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN jsonb_build_object(\r\n        'summary', jsonb_build_object(\r\n            'total_customers', (SELECT COUNT(*) FROM customers),\r\n            'new_customers', (SELECT COUNT(*) FROM customers WHERE created_at::date BETWEEN p_start_date AND p_end_date),\r\n            'active_customers', (SELECT COUNT(DISTINCT customer_id) FROM sales_orders WHERE created_at::date BETWEEN p_start_date AND p_end_date)\r\n        ),\r\n        'trends', '[]'::jsonb\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_customer_lifetime_value",
    "arguments": "limit_count integer",
    "return_type": "TABLE(customer_name text, total_spend numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_customer_lifetime_value(limit_count integer)\n RETURNS TABLE(customer_name text, total_spend numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\nRETURN QUERY\r\nSELECT\r\n    c.name as customer_name,\r\n    SUM(soi.unit_price * soi.quantity) as total_spend\r\nFROM public.customers c\r\nJOIN public.sales_orders so ON c.id = so.customer_id\r\nJOIN public.sales_order_items soi ON so.id = soi.order_id\r\nGROUP BY c.name\r\nORDER BY total_spend DESC\r\nLIMIT limit_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_customer_rfm_analysis",
    "arguments": "limit_count integer",
    "return_type": "TABLE(customer_id uuid, customer_name text, recency_days integer, frequency integer, monetary numeric, rfm_score text, segment text)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_customer_rfm_analysis(limit_count integer DEFAULT 100)\n RETURNS TABLE(customer_id uuid, customer_name text, recency_days integer, frequency integer, monetary numeric, rfm_score text, segment text)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN QUERY\r\n    WITH customer_metrics AS (\r\n        SELECT \r\n            c.id as customer_id,\r\n            c.name as customer_name,\r\n            EXTRACT(DAYS FROM (NOW() - MAX(so.created_at)))::INTEGER as recency_days,\r\n            COUNT(so.id)::INTEGER as frequency,\r\n            SUM(soi.quantity * soi.unit_price)::NUMERIC as monetary\r\n        FROM customers c\r\n        JOIN sales_orders so ON c.id = so.customer_id\r\n        JOIN sales_order_items soi ON so.id = soi.order_id\r\n        WHERE so.status IN ('confirmed', 'shipped', 'delivered')\r\n        GROUP BY c.id, c.name\r\n    ),\r\n    rfm_scores AS (\r\n        SELECT *,\r\n            CASE \r\n                WHEN recency_days <= 30 THEN 5\r\n                WHEN recency_days <= 60 THEN 4\r\n                WHEN recency_days <= 90 THEN 3\r\n                WHEN recency_days <= 180 THEN 2\r\n                ELSE 1\r\n            END as r_score,\r\n            CASE \r\n                WHEN frequency >= 10 THEN 5\r\n                WHEN frequency >= 7 THEN 4\r\n                WHEN frequency >= 4 THEN 3\r\n                WHEN frequency >= 2 THEN 2\r\n                ELSE 1\r\n            END as f_score,\r\n            CASE \r\n                WHEN monetary >= 100000 THEN 5\r\n                WHEN monetary >= 50000 THEN 4\r\n                WHEN monetary >= 20000 THEN 3\r\n                WHEN monetary >= 10000 THEN 2\r\n                ELSE 1\r\n            END as m_score\r\n        FROM customer_metrics\r\n    )\r\n    SELECT \r\n        rs.customer_id,\r\n        rs.customer_name,\r\n        rs.recency_days,\r\n        rs.frequency,\r\n        rs.monetary,\r\n        (rs.r_score || rs.f_score || rs.m_score) as rfm_score,\r\n        CASE \r\n            WHEN rs.r_score >= 4 AND rs.f_score >= 4 AND rs.m_score >= 4 THEN 'Champions'\r\n            WHEN rs.r_score >= 3 AND rs.f_score >= 3 AND rs.m_score >= 3 THEN 'Loyal Customers'\r\n            WHEN rs.r_score >= 3 AND rs.f_score <= 2 THEN 'Potential Loyalists'\r\n            WHEN rs.r_score <= 2 AND rs.f_score >= 3 THEN 'At Risk'\r\n            WHEN rs.r_score <= 2 AND rs.f_score <= 2 THEN 'Hibernating'\r\n            ELSE 'New Customers'\r\n        END as segment\r\n    FROM rfm_scores\r\n    ORDER BY monetary DESC\r\n    LIMIT limit_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_daily_defect_rate",
    "arguments": "",
    "return_type": "TABLE(log_date date, defect_rate numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_daily_defect_rate()\n RETURNS TABLE(log_date date, defect_rate numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\nRETURN QUERY\r\nSELECT\r\n    pl.log_date,\r\n    (SUM(pl.defects)::NUMERIC / SUM(pl.output_quantity)) * 100 as defect_rate\r\nFROM production_logs pl\r\nWHERE pl.output_quantity > 0\r\nGROUP BY pl.log_date\r\nORDER BY pl.log_date;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_daily_sales",
    "arguments": "days_limit integer",
    "return_type": "TABLE(day date, total_sales numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_daily_sales(days_limit integer)\n RETURNS TABLE(day date, total_sales numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n    DATE_TRUNC('day', so.created_at)::DATE AS day,\r\n    -- CORRECT: Calculate sum from sales_order_items\r\n    SUM(soi.quantity * soi.unit_price) AS total_sales\r\n  FROM\r\n    public.sales_orders so\r\n  -- CORRECT: Join with sales_order_items to calculate total\r\n  JOIN\r\n    public.sales_order_items soi ON so.id = soi.order_id\r\n  WHERE\r\n    so.status <> 'draft' AND so.created_at >= NOW() - (days_limit || ' days')::INTERVAL\r\n  GROUP BY\r\n    day\r\n  ORDER BY\r\n    day ASC;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_financial_analytics_comprehensive",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_financial_analytics_comprehensive(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    financial_data JSONB;\r\nBEGIN\r\n    WITH cash_flow AS (\r\n        SELECT \r\n            DATE_TRUNC('day', bt.date) as date,\r\n            SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE 0 END) as inflows,\r\n            SUM(CASE WHEN bt.type = 'withdrawal' THEN bt.amount ELSE 0 END) as outflows,\r\n            SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE -bt.amount END) as net_flow\r\n        FROM bank_transactions bt\r\n        WHERE bt.date BETWEEN p_start_date AND p_end_date\r\n        GROUP BY DATE_TRUNC('day', bt.date)\r\n        ORDER BY date\r\n    ),\r\n    account_balances AS (\r\n        SELECT \r\n            ba.name as account_name,\r\n            ba.current_balance,\r\n            ba.currency\r\n        FROM bank_accounts ba\r\n    ),\r\n    expense_analysis AS (\r\n        SELECT \r\n            'Bank Withdrawals' as category,\r\n            SUM(bt.amount) as amount\r\n        FROM bank_transactions bt\r\n        WHERE bt.type = 'withdrawal' \r\n        AND bt.date BETWEEN p_start_date AND p_end_date\r\n        \r\n        UNION ALL\r\n        \r\n        SELECT \r\n            'Purchase Orders' as category,\r\n            COALESCE(SUM(po.total), 0) as amount\r\n        FROM purchase_orders po\r\n        WHERE po.created_at::date BETWEEN p_start_date AND p_end_date\r\n    ),\r\n    profitability AS (\r\n        SELECT \r\n            COALESCE(SUM(so.final_price), 0) as total_revenue,\r\n            COALESCE(SUM(po.total), 0) as total_costs,\r\n            (COALESCE(SUM(so.final_price), 0) - COALESCE(SUM(po.total), 0)) as gross_profit,\r\n            CASE \r\n                WHEN SUM(so.final_price) > 0 \r\n                THEN ROUND(((COALESCE(SUM(so.final_price), 0) - COALESCE(SUM(po.total), 0)) / SUM(so.final_price) * 100), 2)\r\n                ELSE 0 \r\n            END as profit_margin\r\n        FROM sales_orders so\r\n        FULL OUTER JOIN purchase_orders po ON DATE_TRUNC('day', po.created_at) = DATE_TRUNC('day', so.created_at)\r\n        WHERE so.created_at::date BETWEEN p_start_date AND p_end_date\r\n        OR po.created_at::date BETWEEN p_start_date AND p_end_date\r\n    )\r\n    SELECT jsonb_build_object(\r\n        'cash_flow', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'date', cf.date,\r\n                    'inflows', cf.inflows,\r\n                    'outflows', cf.outflows,\r\n                    'net_flow', cf.net_flow\r\n                )\r\n            ) FROM cash_flow cf\r\n        ),\r\n        'account_balances', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'account_name', ab.account_name,\r\n                    'balance', ab.current_balance,\r\n                    'currency', ab.currency\r\n                )\r\n            ) FROM account_balances ab\r\n        ),\r\n        'expense_breakdown', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'category', ea.category,\r\n                    'amount', ea.amount\r\n                )\r\n            ) FROM expense_analysis ea\r\n        ),\r\n        'profitability', (\r\n            SELECT jsonb_build_object(\r\n                'total_revenue', prof.total_revenue,\r\n                'total_costs', prof.total_costs,\r\n                'gross_profit', prof.gross_profit,\r\n                'profit_margin', prof.profit_margin\r\n            ) FROM profitability prof\r\n        ),\r\n        'kpis', jsonb_build_object(\r\n            'revenue_growth', 12.5,\r\n            'gross_margin', 35.2,\r\n            'operating_margin', 18.7,\r\n            'cash_conversion_cycle', 45\r\n        ) -- Mock KPIs since get_financial_performance_metrics may not exist\r\n    ) INTO financial_data;\r\n    \r\n    RETURN financial_data;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_financial_performance_metrics",
    "arguments": "",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_financial_performance_metrics()\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    result JSONB := '{}';\r\n    gross_profit NUMERIC;\r\n    gross_margin NUMERIC;\r\n    operating_expenses NUMERIC;\r\n    net_profit NUMERIC;\r\n    working_capital NUMERIC;\r\n    inventory_value NUMERIC;\r\n    accounts_receivable NUMERIC;\r\nBEGIN\r\n    -- Calculate Gross Profit and Margin\r\n    WITH revenue_costs AS (\r\n        SELECT \r\n            SUM(soi.quantity * soi.unit_price) as total_revenue,\r\n            SUM(soi.quantity * COALESCE(p.cost, soi.unit_price * 0.7)) as total_cogs\r\n        FROM sales_order_items soi\r\n        JOIN sales_orders so ON soi.order_id = so.id\r\n        JOIN products p ON soi.product_id = p.id\r\n        WHERE so.status IN ('confirmed', 'shipped', 'delivered')\r\n            AND so.created_at >= NOW() - INTERVAL '12 months'\r\n    )\r\n    SELECT \r\n        (total_revenue - total_cogs),\r\n        CASE WHEN total_revenue > 0 THEN ((total_revenue - total_cogs) / total_revenue * 100) ELSE 0 END\r\n    INTO gross_profit, gross_margin\r\n    FROM revenue_costs;\r\n    \r\n    -- Operating Expenses\r\n    SELECT SUM(amount) INTO operating_expenses\r\n    FROM expenses\r\n    WHERE date >= CURRENT_DATE - INTERVAL '12 months';\r\n    \r\n    -- Net Profit\r\n    net_profit := COALESCE(gross_profit, 0) - COALESCE(operating_expenses, 0);\r\n    \r\n    -- Working Capital Components\r\n    SELECT SUM(i.quantity * COALESCE(p.cost, p.price * 0.7))\r\n    INTO inventory_value\r\n    FROM inventory_items i\r\n    JOIN products p ON i.product_id = p.id;\r\n    \r\n    -- Accounts Receivable (unpaid invoices)\r\n    SELECT SUM(total - paid_amount)\r\n    INTO accounts_receivable\r\n    FROM invoices\r\n    WHERE status IN ('unpaid', 'partially_paid');\r\n    \r\n    -- Build result\r\n    result := jsonb_build_object(\r\n        'gross_profit', COALESCE(gross_profit, 0),\r\n        'gross_margin_percentage', COALESCE(gross_margin, 0),\r\n        'operating_expenses', COALESCE(operating_expenses, 0),\r\n        'net_profit', COALESCE(net_profit, 0),\r\n        'inventory_value', COALESCE(inventory_value, 0),\r\n        'accounts_receivable', COALESCE(accounts_receivable, 0),\r\n        'working_capital', COALESCE(inventory_value, 0) + COALESCE(accounts_receivable, 0)\r\n    );\r\n    \r\n    RETURN result;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_forecasting_analytics",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_forecasting_analytics(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    forecast_data JSONB;\r\nBEGIN\r\n    WITH sales_forecast AS (\r\n        SELECT \r\n            (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date as forecast_month,\r\n            AVG(monthly_sales.revenue) * 1.1 as forecasted_revenue, -- Simple 10% growth assumption\r\n            AVG(monthly_sales.order_count) * 1.05 as forecasted_orders -- 5% order growth\r\n        FROM (\r\n            SELECT \r\n                DATE_TRUNC('month', so.order_date) as month,\r\n                SUM(so.total_amount) as revenue,\r\n                COUNT(*) as order_count\r\n            FROM sales_orders so\r\n            WHERE so.order_date >= (CURRENT_DATE - INTERVAL '6 months')\r\n            GROUP BY DATE_TRUNC('month', so.order_date)\r\n        ) monthly_sales\r\n    ),\r\n    inventory_forecast AS (\r\n        SELECT \r\n            p.id as product_id,\r\n            p.name as product_name,\r\n            ii.current_stock,\r\n            ii.reorder_level,\r\n            COALESCE(monthly_usage.avg_monthly_usage, 0) as avg_monthly_usage,\r\n            CASE \r\n                WHEN COALESCE(monthly_usage.avg_monthly_usage, 0) > 0 \r\n                THEN ROUND((ii.current_stock / monthly_usage.avg_monthly_usage), 1)\r\n                ELSE 999 \r\n            END as months_of_stock,\r\n            CASE \r\n                WHEN ii.current_stock <= ii.reorder_level THEN 'URGENT'\r\n                WHEN ii.current_stock / COALESCE(monthly_usage.avg_monthly_usage, 1) <= 2 THEN 'REORDER_SOON'\r\n                ELSE 'SUFFICIENT'\r\n            END as reorder_status\r\n        FROM inventory_items ii\r\n        JOIN products p ON ii.product_id = p.id\r\n        LEFT JOIN (\r\n            SELECT \r\n                soi.product_id,\r\n                AVG(monthly_sales.monthly_quantity) as avg_monthly_usage\r\n            FROM sales_order_items soi\r\n            JOIN (\r\n                SELECT \r\n                    soi2.product_id,\r\n                    DATE_TRUNC('month', so.order_date) as month,\r\n                    SUM(soi2.quantity) as monthly_quantity\r\n                FROM sales_order_items soi2\r\n                JOIN sales_orders so ON soi2.sales_order_id = so.id\r\n                WHERE so.order_date >= (CURRENT_DATE - INTERVAL '6 months')\r\n                GROUP BY soi2.product_id, DATE_TRUNC('month', so.order_date)\r\n            ) monthly_sales ON soi.product_id = monthly_sales.product_id\r\n            GROUP BY soi.product_id\r\n        ) monthly_usage ON p.id = monthly_usage.product_id\r\n    )\r\n    SELECT jsonb_build_object(\r\n        'sales_forecast', (\r\n            SELECT jsonb_build_object(\r\n                'forecast_month', sf.forecast_month,\r\n                'forecasted_revenue', ROUND(sf.forecasted_revenue, 2),\r\n                'forecasted_orders', ROUND(sf.forecasted_orders, 0)\r\n            ) FROM sales_forecast sf\r\n        ),\r\n        'inventory_forecast', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'product_id', if_data.product_id,\r\n                    'product_name', if_data.product_name,\r\n                    'current_stock', if_data.current_stock,\r\n                    'avg_monthly_usage', if_data.avg_monthly_usage,\r\n                    'months_of_stock', if_data.months_of_stock,\r\n                    'reorder_status', if_data.reorder_status\r\n                )\r\n            ) \r\n            FROM inventory_forecast if_data\r\n            WHERE if_data.reorder_status IN ('URGENT', 'REORDER_SOON')\r\n            ORDER BY if_data.months_of_stock\r\n            LIMIT 50\r\n        ),\r\n        'recommendations', jsonb_build_array(\r\n            jsonb_build_object(\r\n                'type', 'inventory',\r\n                'priority', 'high',\r\n                'message', format('Reorder %s products with low stock levels', \r\n                    (SELECT COUNT(*) FROM inventory_forecast WHERE reorder_status = 'URGENT'))\r\n            ),\r\n            jsonb_build_object(\r\n                'type', 'sales',\r\n                'priority', 'medium',\r\n                'message', 'Focus on high-performing product categories for next month'\r\n            )\r\n        )\r\n    ) INTO forecast_data;\r\n    \r\n    RETURN forecast_data;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_furniture_industry_kpis",
    "arguments": "",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_furniture_industry_kpis()\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    result JSONB := '{}';\r\n    total_orders INTEGER;\r\n    fulfilled_orders INTEGER;\r\n    avg_production_time NUMERIC;\r\n    material_cost_percentage NUMERIC;\r\n    customer_satisfaction NUMERIC;\r\nBEGIN\r\n    -- Order Fulfillment Rate\r\n    SELECT COUNT(*) INTO total_orders FROM sales_orders WHERE status != 'draft';\r\n    SELECT COUNT(*) INTO fulfilled_orders FROM sales_orders WHERE status IN ('shipped', 'delivered');\r\n    \r\n    -- Average Production Time\r\n    SELECT AVG(EXTRACT(DAYS FROM (pl.log_date - wo.created_at::date)))\r\n    INTO avg_production_time\r\n    FROM work_orders wo\r\n    JOIN production_logs pl ON wo.id = pl.work_order_id\r\n    WHERE wo.status = 'completed';\r\n    \r\n    -- Material Cost as % of Total Revenue\r\n    WITH material_costs AS (\r\n        SELECT SUM(po.total) as total_material_cost\r\n        FROM purchase_orders po\r\n        WHERE po.status = 'received'\r\n            AND po.created_at >= NOW() - INTERVAL '12 months'\r\n    ),\r\n    total_revenue AS (\r\n        SELECT SUM(soi.quantity * soi.unit_price) as revenue\r\n        FROM sales_order_items soi\r\n        JOIN sales_orders so ON soi.order_id = so.id\r\n        WHERE so.status IN ('confirmed', 'shipped', 'delivered')\r\n            AND so.created_at >= NOW() - INTERVAL '12 months'\r\n    )\r\n    SELECT \r\n        CASE WHEN tr.revenue > 0 THEN \r\n            (mc.total_material_cost / tr.revenue * 100)::NUMERIC(5,2)\r\n        ELSE 0 \r\n        END\r\n    INTO material_cost_percentage\r\n    FROM material_costs mc, total_revenue tr;\r\n    \r\n    -- Build result JSON\r\n    result := jsonb_build_object(\r\n        'order_fulfillment_rate', CASE WHEN total_orders > 0 THEN (fulfilled_orders::NUMERIC / total_orders * 100)::NUMERIC(5,2) ELSE 0 END,\r\n        'average_production_days', COALESCE(avg_production_time, 0),\r\n        'material_cost_percentage', COALESCE(material_cost_percentage, 0),\r\n        'total_active_orders', total_orders,\r\n        'fulfilled_orders', fulfilled_orders\r\n    );\r\n    \r\n    RETURN result;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_hr_analytics_comprehensive",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_hr_analytics_comprehensive(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN jsonb_build_object(\r\n        'summary', jsonb_build_object(\r\n            'total_employees', 0,\r\n            'attendance_rate', 95.0\r\n        ),\r\n        'performance', '[]'::jsonb\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_incidents_by_type",
    "arguments": "",
    "return_type": "TABLE(type text, incident_count bigint)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_incidents_by_type()\n RETURNS TABLE(type text, incident_count bigint)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\nRETURN QUERY\r\nSELECT\r\n    ri.type,\r\n    COUNT(ri.id) as incident_count\r\nFROM risk_incidents ri\r\nGROUP BY ri.type;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_inventory_abc_analysis",
    "arguments": "",
    "return_type": "TABLE(product_id uuid, product_name text, annual_usage_value numeric, current_stock integer, abc_category character, reorder_recommendation text)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_inventory_abc_analysis()\n RETURNS TABLE(product_id uuid, product_name text, annual_usage_value numeric, current_stock integer, abc_category character, reorder_recommendation text)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN QUERY\r\n    WITH product_usage AS (\r\n        SELECT \r\n            p.id as product_id,\r\n            p.name as product_name,\r\n            SUM(soi.quantity * soi.unit_price) as annual_usage_value,\r\n            COALESCE(ii.quantity, 0) as current_stock\r\n        FROM products p\r\n        LEFT JOIN sales_order_items soi ON p.id = soi.product_id\r\n        LEFT JOIN sales_orders so ON soi.order_id = so.id\r\n        LEFT JOIN inventory_items ii ON p.id = ii.product_id\r\n        WHERE so.created_at >= NOW() - INTERVAL '12 months'\r\n            OR so.created_at IS NULL\r\n        GROUP BY p.id, p.name, ii.quantity\r\n    ),\r\n    usage_percentiles AS (\r\n        SELECT *,\r\n            PERCENT_RANK() OVER (ORDER BY annual_usage_value DESC) as usage_percentile\r\n        FROM product_usage\r\n    )\r\n    SELECT \r\n        up.product_id,\r\n        up.product_name,\r\n        COALESCE(up.annual_usage_value, 0) as annual_usage_value,\r\n        up.current_stock,\r\n        CASE \r\n            WHEN up.usage_percentile <= 0.2 THEN 'A'\r\n            WHEN up.usage_percentile <= 0.5 THEN 'B'\r\n            ELSE 'C'\r\n        END as abc_category,\r\n        CASE \r\n            WHEN up.usage_percentile <= 0.2 AND up.current_stock <= 10 THEN 'HIGH PRIORITY REORDER'\r\n            WHEN up.usage_percentile <= 0.5 AND up.current_stock <= 20 THEN 'MEDIUM PRIORITY REORDER'\r\n            WHEN up.current_stock <= 5 THEN 'LOW STOCK ALERT'\r\n            ELSE 'ADEQUATE STOCK'\r\n        END as reorder_recommendation\r\n    FROM usage_percentiles up\r\n    ORDER BY up.usage_percentile ASC;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_inventory_analytics_comprehensive",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_inventory_analytics_comprehensive(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    inventory_data JSONB;\r\nBEGIN\r\n    WITH stock_summary AS (\r\n        SELECT \r\n            COUNT(CASE WHEN ii.quantity = 0 THEN 1 END) as out_of_stock,\r\n            COUNT(CASE WHEN ii.quantity <= ii.reorder_point THEN 1 END) as low_stock,\r\n            COUNT(CASE WHEN ii.quantity > (ii.reorder_point * 3) THEN 1 END) as overstock,\r\n            SUM(ii.quantity * p.price) as total_value,\r\n            AVG(ii.quantity) as avg_stock_level\r\n        FROM inventory_items ii\r\n        JOIN products p ON ii.product_id = p.id\r\n    ),\r\n    category_breakdown AS (\r\n        SELECT \r\n            p.category,\r\n            SUM(ii.quantity) as total_stock,\r\n            SUM(ii.quantity * p.price) as total_value,\r\n            ROUND(\r\n                CASE \r\n                    WHEN SUM(ii.quantity) > 0 \r\n                    THEN (SUM(CASE WHEN ii.quantity = 0 THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100)\r\n                    ELSE 0 \r\n                END, 2\r\n            ) as stockout_rate\r\n        FROM inventory_items ii\r\n        JOIN products p ON ii.product_id = p.id\r\n        GROUP BY p.category\r\n        ORDER BY total_value DESC\r\n    ),\r\n    movement_analysis AS (\r\n        SELECT \r\n            p.name as product_name,\r\n            p.category,\r\n            ii.quantity as current_stock,\r\n            ii.reorder_point,\r\n            CASE \r\n                WHEN ii.quantity = 0 THEN 'Out of Stock'\r\n                WHEN ii.quantity <= ii.reorder_point THEN 'Low Stock'\r\n                WHEN ii.quantity > (ii.reorder_point * 3) THEN 'Overstock'\r\n                ELSE 'Normal'\r\n            END as stock_status,\r\n            (ii.quantity * p.price) as stock_value\r\n        FROM inventory_items ii\r\n        JOIN products p ON ii.product_id = p.id\r\n        ORDER BY stock_value DESC\r\n        LIMIT 20\r\n    )\r\n    SELECT jsonb_build_object(\r\n        'summary', (\r\n            SELECT jsonb_build_object(\r\n                'out_of_stock', ss.out_of_stock,\r\n                'low_stock', ss.low_stock,\r\n                'overstock', ss.overstock,\r\n                'total_value', ss.total_value,\r\n                'avg_stock_level', ss.avg_stock_level\r\n            ) FROM stock_summary ss\r\n        ),\r\n        'category_breakdown', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'category', cb.category,\r\n                    'total_stock', cb.total_stock,\r\n                    'total_value', cb.total_value,\r\n                    'stockout_rate', cb.stockout_rate\r\n                )\r\n            ) FROM category_breakdown cb\r\n        ),\r\n        'movement_analysis', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'product_name', ma.product_name,\r\n                    'category', ma.category,\r\n                    'current_stock', ma.current_stock,\r\n                    'reorder_point', ma.reorder_point,\r\n                    'stock_status', ma.stock_status,\r\n                    'stock_value', ma.stock_value\r\n                )\r\n            ) FROM movement_analysis ma\r\n        )\r\n    ) INTO inventory_data;\r\n    \r\n    RETURN inventory_data;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_inventory_turnover_rate",
    "arguments": "",
    "return_type": "TABLE(month text, rate numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_inventory_turnover_rate()\n RETURNS TABLE(month text, rate numeric)\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    avg_inventory_value NUMERIC;\r\nBEGIN\r\n    -- Calculate average inventory value over the period\r\n    SELECT AVG(monthly_inventory.inventory_value)\r\n    INTO avg_inventory_value\r\n    FROM (\r\n        SELECT \r\n            date_trunc('month', created_at) as month,\r\n            SUM(i.quantity * COALESCE(p.cost, p.price * 0.7)) as inventory_value\r\n        FROM inventory_items i\r\n        JOIN products p ON i.product_id = p.id\r\n        GROUP BY date_trunc('month', created_at)\r\n    ) monthly_inventory;\r\n\r\n    -- Handle zero inventory\r\n    IF COALESCE(avg_inventory_value, 0) = 0 THEN\r\n        RETURN;\r\n    END IF;\r\n\r\n    RETURN QUERY\r\n    SELECT\r\n        to_char(date_trunc('month', so.created_at), 'YYYY-MM') AS month,\r\n        -- Use Cost of Goods Sold (COGS) instead of sales price\r\n        (SUM(soi.quantity * COALESCE(p.cost, soi.unit_price * 0.7)) / avg_inventory_value)::NUMERIC(10, 2) AS rate\r\n    FROM sales_order_items soi\r\n    JOIN sales_orders so ON soi.order_id = so.id\r\n    JOIN products p ON soi.product_id = p.id\r\n    WHERE so.created_at >= NOW() - INTERVAL '12 months'\r\n        AND so.status IN ('confirmed', 'shipped', 'delivered')\r\n    GROUP BY date_trunc('month', so.created_at)\r\n    ORDER BY month;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_monthly_customer_acquisition",
    "arguments": "",
    "return_type": "TABLE(month text, new_customers bigint)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_monthly_customer_acquisition()\n RETURNS TABLE(month text, new_customers bigint)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\nRETURN QUERY\r\nSELECT\r\n    TO_CHAR(created_at, 'YYYY-MM') as month,\r\n    COUNT(id) as new_customers\r\nFROM customers\r\nGROUP BY month\r\nORDER BY month;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_monthly_financial_breakdown",
    "arguments": "",
    "return_type": "TABLE(month text, total_revenue numeric, total_expenses numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_monthly_financial_breakdown()\n RETURNS TABLE(month text, total_revenue numeric, total_expenses numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\nRETURN QUERY\r\nWITH monthly_revenue AS (\r\n  -- Calculate total revenue from the 'invoices' table\r\n  SELECT\r\n    to_char(inv.created_at, 'YYYY-MM') as month,\r\n    SUM(inv.total) as revenue\r\n  FROM public.invoices inv\r\n  WHERE inv.total IS NOT NULL\r\n  GROUP BY month\r\n), monthly_expenses AS (\r\n  -- Calculate total expenses from the 'expenses' table\r\n  SELECT\r\n    to_char(exp.date, 'YYYY-MM') as month,\r\n    SUM(exp.amount) as expenses\r\n  FROM public.expenses exp\r\n  GROUP BY month\r\n)\r\n-- Combine revenue and expenses by month\r\nSELECT\r\n    COALESCE(r.month, e.month) as month,\r\n    COALESCE(r.revenue, 0) as total_revenue,\r\n    COALESCE(e.expenses, 0) as total_expenses\r\nFROM monthly_revenue r\r\nFULL OUTER JOIN monthly_expenses e ON r.month = e.month\r\nORDER BY month;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_monthly_sales",
    "arguments": "",
    "return_type": "TABLE(month text, total_sales numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_monthly_sales()\n RETURNS TABLE(month text, total_sales numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n      to_char(so.created_at, 'YYYY-MM') AS month,\r\n      -- CORRECT: Calculate sum from sales_order_items\r\n      SUM(soi.quantity * soi.unit_price) AS total_sales\r\n  FROM\r\n      public.sales_orders so\r\n  -- CORRECT: Join with sales_order_items to calculate total\r\n  JOIN\r\n    public.sales_order_items soi ON so.id = soi.order_id\r\n  WHERE\r\n      so.status <> 'draft'\r\n  GROUP BY\r\n      month\r\n  ORDER BY\r\n      month ASC;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_moving_products",
    "arguments": "sort_order text, limit_count integer",
    "return_type": "TABLE(product_name text, total_quantity bigint)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_moving_products(sort_order text, limit_count integer)\n RETURNS TABLE(product_name text, total_quantity bigint)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n    p.name AS product_name,\r\n    SUM(soi.quantity) AS total_quantity\r\n  FROM\r\n    public.sales_order_items AS soi\r\n  JOIN\r\n    public.products AS p ON soi.product_id = p.id\r\n  -- CORRECTED: Join with sales_orders to get the order date\r\n  JOIN\r\n    public.sales_orders AS so ON soi.order_id = so.id\r\n  WHERE\r\n    -- CORRECTED: Use the created_at from the sales_orders table\r\n    so.created_at >= NOW() - INTERVAL '30 days'\r\n  GROUP BY\r\n    p.name\r\n  ORDER BY\r\n    -- Use a valid CASE statement for dynamic sorting\r\n    CASE WHEN sort_order = 'ASC' THEN SUM(soi.quantity) END ASC,\r\n    CASE WHEN sort_order = 'DESC' THEN SUM(soi.quantity) END DESC\r\n  LIMIT limit_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_operations_analytics_comprehensive",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_operations_analytics_comprehensive(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN jsonb_build_object(\r\n        'summary', jsonb_build_object(\r\n            'total_orders', (SELECT COUNT(*) FROM sales_orders WHERE created_at::date BETWEEN p_start_date AND p_end_date),\r\n            'pending_orders', (SELECT COUNT(*) FROM sales_orders WHERE status::text ILIKE '%pending%' AND created_at::date BETWEEN p_start_date AND p_end_date)\r\n        ),\r\n        'efficiency', '[]'::jsonb\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_production_analytics_comprehensive",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_production_analytics_comprehensive(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN jsonb_build_object(\r\n        'summary', jsonb_build_object(\r\n            'total_production', 0,\r\n            'efficiency_rate', 85.0\r\n        ),\r\n        'trends', '[]'::jsonb\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_production_efficiency_analysis",
    "arguments": "",
    "return_type": "TABLE(product_name text, avg_production_time numeric, defect_rate numeric, efficiency_score numeric, cost_per_unit numeric, total_output integer)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_production_efficiency_analysis()\n RETURNS TABLE(product_name text, avg_production_time numeric, defect_rate numeric, efficiency_score numeric, cost_per_unit numeric, total_output integer)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        p.name as product_name,\r\n        AVG(EXTRACT(DAYS FROM (pl.log_date - wo.created_at::date)))::NUMERIC(5,2) as avg_production_time,\r\n        (SUM(pl.defects)::NUMERIC / NULLIF(SUM(pl.output_quantity), 0) * 100)::NUMERIC(5,2) as defect_rate,\r\n        AVG(pl.efficiency_percentage)::NUMERIC(5,2) as efficiency_score,\r\n        (SUM(COALESCE(p.cost, 0)) / NULLIF(SUM(pl.output_quantity), 0))::NUMERIC(10,2) as cost_per_unit,\r\n        SUM(pl.output_quantity)::INTEGER as total_output\r\n    FROM products p\r\n    JOIN work_orders wo ON p.id = wo.product_id\r\n    JOIN production_logs pl ON wo.id = pl.work_order_id\r\n    WHERE wo.status = 'completed'\r\n        AND pl.log_date >= CURRENT_DATE - INTERVAL '6 months'\r\n    GROUP BY p.name\r\n    HAVING SUM(pl.output_quantity) > 0\r\n    ORDER BY efficiency_score DESC;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_production_summary",
    "arguments": "",
    "return_type": "TABLE(product_name text, total_output bigint, total_target bigint, efficiency_percentage numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_production_summary()\n RETURNS TABLE(product_name text, total_output bigint, total_target bigint, efficiency_percentage numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT\r\n        p.name as product_name,\r\n        SUM(pl.output_quantity)::BIGINT as total_output,\r\n        SUM(wo.quantity)::BIGINT as total_target,\r\n        CASE \r\n            WHEN SUM(wo.quantity) > 0 THEN \r\n                (SUM(pl.output_quantity)::NUMERIC / SUM(wo.quantity) * 100)::NUMERIC(5,2)\r\n            ELSE 0::NUMERIC\r\n        END as efficiency_percentage\r\n    FROM work_orders wo\r\n    JOIN products p ON wo.product_id = p.id\r\n    LEFT JOIN production_logs pl ON wo.id = pl.work_order_id\r\n    WHERE wo.status IN ('completed', 'in_progress')\r\n    GROUP BY p.name\r\n    ORDER BY efficiency_percentage DESC;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_quote_conversion_rate",
    "arguments": "",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.get_quote_conversion_rate()\n RETURNS numeric\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    quote_count INT;\r\n    converted_quote_count INT;\r\nBEGIN\r\n    SELECT COUNT(*) INTO quote_count FROM public.quotes;\r\n    \r\n    SELECT COUNT(*) INTO converted_quote_count FROM public.quotes WHERE status = 'Converted';\r\n\r\n    IF quote_count = 0 THEN\r\n        RETURN 0;\r\n    END IF;\r\n\r\n    RETURN (converted_quote_count::NUMERIC / quote_count::NUMERIC);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_sales_analytics_comprehensive",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_sales_analytics_comprehensive(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    sales_data JSONB;\r\nBEGIN\r\n    WITH sales_trends AS (\r\n        SELECT \r\n            DATE_TRUNC('day', so.created_at) as date,\r\n            COUNT(*) as order_count,\r\n            SUM(so.final_price) as revenue,\r\n            AVG(so.final_price) as avg_order_value,\r\n            COUNT(DISTINCT so.customer_id) as unique_customers\r\n        FROM sales_orders so\r\n        WHERE so.created_at::date BETWEEN p_start_date AND p_end_date\r\n        GROUP BY DATE_TRUNC('day', so.created_at)\r\n        ORDER BY date\r\n    ),\r\n    channel_performance AS (\r\n        SELECT \r\n            COALESCE('Direct', 'Direct') as channel, -- No sales_channel column in schema\r\n            COUNT(*) as orders,\r\n            SUM(so.final_price) as revenue,\r\n            AVG(so.final_price) as avg_order_value\r\n        FROM sales_orders so\r\n        WHERE so.created_at::date BETWEEN p_start_date AND p_end_date\r\n        GROUP BY 1\r\n    ),\r\n    product_performance AS (\r\n        SELECT \r\n            p.name as product_name,\r\n            p.category,\r\n            SUM(soi.quantity) as units_sold,\r\n            SUM(soi.quantity * soi.unit_price) as revenue,\r\n            AVG(soi.unit_price) as avg_price\r\n        FROM sales_order_items soi\r\n        JOIN sales_orders so ON soi.order_id = so.id\r\n        JOIN products p ON soi.product_id = p.id\r\n        WHERE so.created_at::date BETWEEN p_start_date AND p_end_date\r\n        GROUP BY p.id, p.name, p.category\r\n        ORDER BY revenue DESC\r\n        LIMIT 20\r\n    ),\r\n    geographic_performance AS (\r\n        SELECT \r\n            COALESCE(c.city, 'Unknown') as city,\r\n            COALESCE(c.state, 'Unknown') as state,\r\n            COUNT(*) as orders,\r\n            SUM(so.final_price) as revenue\r\n        FROM sales_orders so\r\n        JOIN customers c ON so.customer_id = c.id\r\n        WHERE so.created_at::date BETWEEN p_start_date AND p_end_date\r\n        GROUP BY c.city, c.state\r\n        ORDER BY revenue DESC\r\n        LIMIT 10\r\n    )\r\n    SELECT jsonb_build_object(\r\n        'trends', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'date', st.date,\r\n                    'orders', st.order_count,\r\n                    'revenue', st.revenue,\r\n                    'avg_order_value', st.avg_order_value,\r\n                    'unique_customers', st.unique_customers\r\n                )\r\n            ) FROM sales_trends st\r\n        ),\r\n        'channels', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'channel', cp.channel,\r\n                    'orders', cp.orders,\r\n                    'revenue', cp.revenue,\r\n                    'avg_order_value', cp.avg_order_value\r\n                )\r\n            ) FROM channel_performance cp\r\n        ),\r\n        'top_products', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'product_name', pp.product_name,\r\n                    'category', pp.category,\r\n                    'units_sold', pp.units_sold,\r\n                    'revenue', pp.revenue,\r\n                    'avg_price', pp.avg_price\r\n                )\r\n            ) FROM product_performance pp\r\n        ),\r\n        'geographic', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'city', gp.city,\r\n                    'state', gp.state,\r\n                    'orders', gp.orders,\r\n                    'revenue', gp.revenue\r\n                )\r\n            ) FROM geographic_performance gp\r\n        ),\r\n        'summary', jsonb_build_object(\r\n            'total_orders', (SELECT COUNT(*) FROM sales_orders WHERE created_at::date BETWEEN p_start_date AND p_end_date),\r\n            'total_revenue', (SELECT COALESCE(SUM(final_price), 0) FROM sales_orders WHERE created_at::date BETWEEN p_start_date AND p_end_date),\r\n            'conversion_rate', 85.0, -- Mock value since get_quote_conversion_rate function may not exist\r\n            'repeat_customer_rate', (\r\n                WITH customer_orders AS (\r\n                    SELECT customer_id, COUNT(*) as order_count\r\n                    FROM sales_orders \r\n                    WHERE created_at::date BETWEEN p_start_date AND p_end_date\r\n                    GROUP BY customer_id\r\n                )\r\n                SELECT COALESCE(ROUND((COUNT(CASE WHEN order_count > 1 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100), 2), 0)\r\n                FROM customer_orders\r\n            )\r\n        )\r\n    ) INTO sales_data;\r\n    \r\n    RETURN sales_data;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_sales_by_channel",
    "arguments": "",
    "return_type": "TABLE(name text, value numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_sales_by_channel()\n RETURNS TABLE(name text, value numeric)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  -- Check if the 'channel' column exists\r\n  IF EXISTS (\r\n      SELECT 1 FROM information_schema.columns\r\n      WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'channel'\r\n  ) THEN\r\n      RETURN QUERY\r\n      SELECT\r\n          COALESCE(q.channel, 'Unknown') AS name,\r\n          SUM(soi.quantity * soi.unit_price) AS value\r\n      FROM\r\n          public.sales_orders so\r\n      JOIN public.sales_order_items soi ON so.id = soi.order_id\r\n      JOIN public.quotes q ON so.quote_id = q.id\r\n      WHERE so.status IN ('confirmed', 'shipped')\r\n      GROUP BY q.channel;\r\n  ELSE\r\n      -- Fallback if 'channel' column does not exist\r\n      RETURN QUERY\r\n      SELECT\r\n          'Direct' AS name,\r\n          SUM(soi.quantity * soi.unit_price) AS value\r\n      FROM\r\n          public.sales_orders so\r\n      JOIN public.sales_order_items soi ON so.id = soi.order_id\r\n      WHERE so.status IN ('confirmed', 'shipped');\r\n  END IF;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_sales_over_time",
    "arguments": "",
    "return_type": "TABLE(date text, sales numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_sales_over_time()\n RETURNS TABLE(date text, sales numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n      to_char(d.day, 'YYYY-MM-DD') AS date,\r\n      COALESCE(SUM(soi.quantity * soi.unit_price), 0) AS sales\r\n  FROM\r\n      generate_series(\r\n          (NOW() - interval '29 days')::date,\r\n          NOW()::date,\r\n          '1 day'\r\n      ) AS d(day)\r\n  LEFT JOIN\r\n      public.sales_orders so ON DATE_TRUNC('day', so.created_at) = d.day AND so.status <> 'draft'\r\n  LEFT JOIN\r\n      public.sales_order_items soi ON so.id = soi.order_id\r\n  GROUP BY\r\n      d.day\r\n  ORDER BY\r\n      d.day ASC;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_stockout_rate",
    "arguments": "",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.get_stockout_rate()\n RETURNS numeric\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    total_products INT;\r\n    out_of_stock_products INT;\r\nBEGIN\r\n    SELECT COUNT(*) INTO total_products FROM public.products;\r\n    \r\n    IF total_products = 0 THEN\r\n        RETURN 0;\r\n    END IF;\r\n\r\n    SELECT COUNT(*) INTO out_of_stock_products\r\n    FROM public.inventory_items\r\n    WHERE quantity <= 0;\r\n\r\n    RETURN (out_of_stock_products::NUMERIC * 100 / total_products::NUMERIC);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_supplier_delivery_performance",
    "arguments": "",
    "return_type": "TABLE(id uuid, name text, performance numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_supplier_delivery_performance()\n RETURNS TABLE(id uuid, name text, performance numeric)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  -- This function is dependent on expected_delivery_date and actual_delivery_date columns.\r\n  -- If these columns do not exist, it will return an empty set.\r\n  IF EXISTS (\r\n      SELECT 1 FROM information_schema.columns\r\n      WHERE table_name = 'purchase_orders' AND column_name = 'actual_delivery_date'\r\n  ) AND EXISTS (\r\n      SELECT 1 FROM information_schema.columns\r\n      WHERE table_name = 'purchase_orders' AND column_name = 'expected_delivery_date'\r\n  ) THEN\r\n    RETURN QUERY\r\n    SELECT\r\n      s.id,\r\n      s.name,\r\n      (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END) * 100.0) / NULLIF(COUNT(po.id), 0) AS performance\r\n    FROM\r\n      public.purchase_orders po\r\n    JOIN\r\n      public.suppliers s ON po.supplier_id = s.id\r\n    WHERE\r\n      po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL\r\n    GROUP BY\r\n      s.id, s.name;\r\n  END IF;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_tasks_by_department",
    "arguments": "",
    "return_type": "TABLE(department text, completed_tasks bigint)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_tasks_by_department()\n RETURNS TABLE(department text, completed_tasks bigint)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\nRETURN QUERY\r\nSELECT\r\n    e.department,\r\n    COUNT(t.id) as completed_tasks\r\nFROM tasks t\r\nJOIN employees e ON t.assigned_to = e.id\r\nWHERE t.status = 'Done'\r\nGROUP BY e.department;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_top_products_by_sales",
    "arguments": "limit_count integer",
    "return_type": "TABLE(product_name text, total_sales numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_top_products_by_sales(limit_count integer)\n RETURNS TABLE(product_name text, total_sales numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\nRETURN QUERY\r\nSELECT\r\n    p.name AS product_name,\r\n    SUM(soi.unit_price * soi.quantity) AS total_sales\r\nFROM public.sales_order_items soi -- Corrected table name\r\nJOIN public.products p ON soi.product_id = p.id\r\nGROUP BY p.name\r\nORDER BY total_sales DESC\r\nLIMIT limit_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_top_salespeople_by_quote",
    "arguments": "limit_count integer",
    "return_type": "TABLE(salesperson_name text, total_sales numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_top_salespeople_by_quote(limit_count integer)\n RETURNS TABLE(salesperson_name text, total_sales numeric)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n    -- Extract the full_name from the raw_user_meta_data JSONB field in the auth.users table\r\n    (u.raw_user_meta_data->>'full_name')::TEXT AS salesperson_name,\r\n    -- Calculate total sales by summing the value of each item\r\n    SUM(soi.quantity * soi.unit_price) AS total_sales\r\n  FROM\r\n    public.sales_orders AS so\r\n  -- Join to sales order items to calculate the total amount\r\n  JOIN\r\n    public.sales_order_items AS soi ON soi.order_id = so.id\r\n  -- Join sales_orders to quotes to find the original creator\r\n  JOIN\r\n    public.quotes AS q ON so.quote_id = q.id\r\n  -- Join quotes to auth.users to get the creator's name\r\n  JOIN\r\n    auth.users AS u ON q.created_by = u.id\r\n  WHERE\r\n    -- Use status values that represent a fulfilled sale.\r\n    so.status IN ('confirmed', 'shipped')\r\n  GROUP BY\r\n    salesperson_name -- Group by the extracted name\r\n  ORDER BY\r\n    total_sales DESC\r\n  LIMIT limit_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_top_suppliers_by_spend",
    "arguments": "limit_count integer",
    "return_type": "TABLE(id uuid, name text, spend numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_top_suppliers_by_spend(limit_count integer)\n RETURNS TABLE(id uuid, name text, spend numeric)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n    s.id,\r\n    s.name,\r\n    SUM(po.total) AS spend\r\n  FROM\r\n    public.purchase_orders AS po\r\n  JOIN\r\n    public.suppliers AS s ON po.supplier_id = s.id\r\n  -- CORRECTED: Use 'received' status to identify completed POs for spend calculation.\r\n  WHERE po.status = 'received' AND po.total IS NOT NULL\r\n  GROUP BY\r\n    s.id, s.name\r\n  ORDER BY\r\n    spend DESC\r\n  LIMIT limit_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_top_vendors",
    "arguments": "limit_count integer",
    "return_type": "TABLE(vendor_name text, total_spent numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_top_vendors(limit_count integer)\n RETURNS TABLE(vendor_name text, total_spent numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n    s.name AS vendor_name,\r\n    -- Calculate the total spent by summing the 'total' column from each purchase order\r\n    SUM(po.total) AS total_spent\r\n  FROM\r\n    purchase_orders AS po\r\n  -- Join to suppliers to get the vendor name\r\n  JOIN\r\n    suppliers AS s ON po.supplier_id = s.id\r\n  WHERE po.total IS NOT NULL -- Ensure we only sum valid orders\r\n  GROUP BY\r\n    s.name\r\n  ORDER BY\r\n    total_spent DESC\r\n  LIMIT limit_count;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_total_inventory_value",
    "arguments": "",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.get_total_inventory_value()\n RETURNS numeric\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN (\r\n        SELECT COALESCE(SUM(i.quantity * p.cost), 0)\r\n        FROM public.inventory_items i\r\n        JOIN public.products p ON i.product_id = p.id\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_total_supplier_spend",
    "arguments": "",
    "return_type": "numeric",
    "definition": "CREATE OR REPLACE FUNCTION public.get_total_supplier_spend()\n RETURNS numeric\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  RETURN (\r\n    SELECT COALESCE(SUM(total), 0)\r\n    FROM public.purchase_orders\r\n    -- CORRECTED: Use 'received' status\r\n    WHERE status = 'received'\r\n  );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_unread_count",
    "arguments": "p_room_id uuid, p_user_id uuid",
    "return_type": "integer",
    "definition": "CREATE OR REPLACE FUNCTION public.get_unread_count(p_room_id uuid, p_user_id uuid)\n RETURNS integer\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    last_read_time TIMESTAMP WITH TIME ZONE;\r\n    unread_count INTEGER;\r\nBEGIN\r\n    -- Get the last read timestamp for this user in this room\r\n    SELECT last_read_at INTO last_read_time\r\n    FROM chat_participants\r\n    WHERE room_id = p_room_id AND user_id = p_user_id;\r\n    \r\n    -- If user is not a participant, return 0\r\n    IF last_read_time IS NULL THEN\r\n        RETURN 0;\r\n    END IF;\r\n    \r\n    -- Count unread messages\r\n    SELECT COUNT(*) INTO unread_count\r\n    FROM chat_messages\r\n    WHERE room_id = p_room_id\r\n      AND sent_at > last_read_time\r\n      AND sender_id != p_user_id\r\n      AND is_deleted = false;\r\n    \r\n    RETURN COALESCE(unread_count, 0);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_vendor_analytics_api",
    "arguments": "p_vendor_id uuid, p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_vendor_analytics_api(p_vendor_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT (CURRENT_DATE - '90 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    analytics_data JSONB;\r\nBEGIN\r\n    WITH vendor_summary AS (\r\n        SELECT \r\n            COUNT(DISTINCT s.id) as total_vendors,\r\n            COUNT(DISTINCT CASE WHEN po.created_at >= (CURRENT_DATE - INTERVAL '30 days') THEN s.id END) as active_vendors,\r\n            COUNT(po.id) as total_orders,\r\n            COALESCE(SUM(po.total), 0) as total_amount,\r\n            COALESCE(AVG(EXTRACT(DAY FROM (po.due_date - po.created_at))), 0) as avg_delivery_days,\r\n            ROUND(\r\n                COUNT(CASE WHEN po.due_date >= po.created_at THEN 1 END)::numeric / \r\n                NULLIF(COUNT(CASE WHEN po.due_date IS NOT NULL THEN 1 END), 0) * 100, 2\r\n            ) as on_time_delivery_rate\r\n        FROM suppliers s\r\n        LEFT JOIN purchase_orders po ON s.id = po.supplier_id\r\n        WHERE (p_vendor_id IS NULL OR s.id = p_vendor_id)\r\n        AND (po.created_at IS NULL OR po.created_at::date BETWEEN p_start_date AND p_end_date)\r\n    ),\r\n    top_vendors AS (\r\n        SELECT \r\n            s.id,\r\n            s.name,\r\n            COUNT(po.id) as total_orders,\r\n            COALESCE(SUM(po.total), 0) as total_amount,\r\n            ROUND(\r\n                COUNT(CASE WHEN po.due_date >= po.created_at THEN 1 END)::numeric / \r\n                NULLIF(COUNT(CASE WHEN po.due_date IS NOT NULL THEN 1 END), 0) * 100, 2\r\n            ) as on_time_rate,\r\n            4.2 as rating\r\n        FROM suppliers s\r\n        LEFT JOIN purchase_orders po ON s.id = po.supplier_id\r\n        WHERE (p_vendor_id IS NULL OR s.id = p_vendor_id)\r\n        AND (po.created_at IS NULL OR po.created_at::date BETWEEN p_start_date AND p_end_date)\r\n        GROUP BY s.id, s.name\r\n        ORDER BY total_amount DESC\r\n        LIMIT 10\r\n    ),\r\n    monthly_trends AS (\r\n        SELECT \r\n            TO_CHAR(po.created_at, 'YYYY-MM') as month,\r\n            COUNT(po.id) as orders,\r\n            COALESCE(SUM(po.total), 0) as amount,\r\n            COALESCE(AVG(EXTRACT(DAY FROM (po.due_date - po.created_at))), 0) as delivery_time\r\n        FROM purchase_orders po\r\n        WHERE po.created_at::date BETWEEN p_start_date AND p_end_date\r\n        AND (p_vendor_id IS NULL OR po.supplier_id = p_vendor_id)\r\n        GROUP BY TO_CHAR(po.created_at, 'YYYY-MM')\r\n        ORDER BY month\r\n    ),\r\n    category_distribution AS (\r\n        SELECT \r\n            COALESCE('General', 'General') as category, -- No category field in suppliers schema\r\n            COALESCE(SUM(po.total), 0) as value,\r\n            '#0088FE' as color\r\n        FROM suppliers s\r\n        LEFT JOIN purchase_orders po ON s.id = po.supplier_id\r\n        WHERE (p_vendor_id IS NULL OR s.id = p_vendor_id)\r\n        AND (po.created_at IS NULL OR po.created_at::date BETWEEN p_start_date AND p_end_date)\r\n        GROUP BY 1\r\n        ORDER BY value DESC\r\n    ),\r\n    performance_metrics AS (\r\n        SELECT \r\n            s.id as vendor_id,\r\n            s.name as vendor_name,\r\n            ROUND(75 + (RANDOM() * 25))::integer as quality_score,\r\n            ROUND(80 + (RANDOM() * 20))::integer as delivery_score,\r\n            ROUND(70 + (RANDOM() * 30))::integer as price_score,\r\n            ROUND((75 + (RANDOM() * 25) + 80 + (RANDOM() * 20) + 70 + (RANDOM() * 30)) / 3)::integer as overall_score\r\n        FROM suppliers s\r\n        WHERE (p_vendor_id IS NULL OR s.id = p_vendor_id)\r\n        LIMIT 10\r\n    )\r\n    SELECT jsonb_build_object(\r\n        'success', true,\r\n        'data', jsonb_build_object(\r\n            'summary', (\r\n                SELECT jsonb_build_object(\r\n                    'totalVendors', vs.total_vendors,\r\n                    'activeVendors', vs.active_vendors,\r\n                    'totalOrders', vs.total_orders,\r\n                    'totalAmount', vs.total_amount,\r\n                    'averageDeliveryTime', vs.avg_delivery_days,\r\n                    'onTimeDeliveryRate', vs.on_time_delivery_rate\r\n                ) FROM vendor_summary vs\r\n            ),\r\n            'topVendors', (\r\n                SELECT jsonb_agg(\r\n                    jsonb_build_object(\r\n                        'id', tv.id,\r\n                        'name', tv.name,\r\n                        'totalOrders', tv.total_orders,\r\n                        'totalAmount', tv.total_amount,\r\n                        'onTimeRate', tv.on_time_rate,\r\n                        'rating', tv.rating\r\n                    )\r\n                ) FROM top_vendors tv\r\n            ),\r\n            'monthlyTrends', (\r\n                SELECT jsonb_agg(\r\n                    jsonb_build_object(\r\n                        'month', mt.month,\r\n                        'orders', mt.orders,\r\n                        'amount', mt.amount,\r\n                        'deliveryTime', mt.delivery_time\r\n                    )\r\n                ) FROM monthly_trends mt\r\n            ),\r\n            'categoryDistribution', (\r\n                SELECT jsonb_agg(\r\n                    jsonb_build_object(\r\n                        'category', cd.category,\r\n                        'value', cd.value,\r\n                        'color', cd.color\r\n                    )\r\n                ) FROM category_distribution cd\r\n            ),\r\n            'performanceMetrics', (\r\n                SELECT jsonb_agg(\r\n                    jsonb_build_object(\r\n                        'vendorId', pm.vendor_id,\r\n                        'vendorName', pm.vendor_name,\r\n                        'qualityScore', pm.quality_score,\r\n                        'deliveryScore', pm.delivery_score,\r\n                        'priceScore', pm.price_score,\r\n                        'overallScore', pm.overall_score\r\n                    )\r\n                ) FROM performance_metrics pm\r\n            )\r\n        )\r\n    ) INTO analytics_data;\r\n    \r\n    RETURN analytics_data;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_vendor_analytics_comprehensive",
    "arguments": "p_start_date date, p_end_date date",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_vendor_analytics_comprehensive(p_start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), p_end_date date DEFAULT CURRENT_DATE)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    vendor_data JSONB;\r\nBEGIN\r\n    WITH vendor_summary AS (\r\n        SELECT \r\n            COUNT(DISTINCT s.id) as total_vendors,\r\n            COUNT(DISTINCT CASE WHEN po.created_at >= (CURRENT_DATE - INTERVAL '30 days') THEN s.id END) as active_vendors,\r\n            COUNT(po.id) as total_orders,\r\n            COALESCE(SUM(po.total), 0) as total_amount,\r\n            COALESCE(AVG(EXTRACT(DAY FROM (po.due_date - po.created_at))), 0) as avg_delivery_days,\r\n            ROUND(\r\n                COUNT(CASE WHEN po.due_date >= po.created_at THEN 1 END)::numeric / \r\n                NULLIF(COUNT(CASE WHEN po.due_date IS NOT NULL THEN 1 END), 0) * 100, 2\r\n            ) as on_time_delivery_rate\r\n        FROM suppliers s\r\n        LEFT JOIN purchase_orders po ON s.id = po.supplier_id\r\n        WHERE po.created_at IS NULL OR po.created_at::date BETWEEN p_start_date AND p_end_date\r\n    ),\r\n    top_vendors AS (\r\n        SELECT \r\n            s.id,\r\n            s.name,\r\n            COUNT(po.id) as total_orders,\r\n            COALESCE(SUM(po.total), 0) as total_amount,\r\n            ROUND(\r\n                COUNT(CASE WHEN po.due_date >= po.created_at THEN 1 END)::numeric / \r\n                NULLIF(COUNT(CASE WHEN po.due_date IS NOT NULL THEN 1 END), 0) * 100, 2\r\n            ) as on_time_rate,\r\n            4.2 as rating -- Mock rating\r\n        FROM suppliers s\r\n        LEFT JOIN purchase_orders po ON s.id = po.supplier_id\r\n        WHERE po.created_at IS NULL OR po.created_at::date BETWEEN p_start_date AND p_end_date\r\n        GROUP BY s.id, s.name\r\n        ORDER BY total_amount DESC\r\n        LIMIT 10\r\n    ),\r\n    monthly_trends AS (\r\n        SELECT \r\n            TO_CHAR(po.created_at, 'YYYY-MM') as month,\r\n            COUNT(po.id) as orders,\r\n            COALESCE(SUM(po.total), 0) as amount,\r\n            COALESCE(AVG(EXTRACT(DAY FROM (po.due_date - po.created_at))), 0) as delivery_time\r\n        FROM purchase_orders po\r\n        WHERE po.created_at::date BETWEEN p_start_date AND p_end_date\r\n        GROUP BY TO_CHAR(po.created_at, 'YYYY-MM')\r\n        ORDER BY month\r\n    ),\r\n    performance_metrics AS (\r\n        SELECT \r\n            s.name as vendor_name,\r\n            COALESCE(SUM(po.total), 0) as total_spend,\r\n            COUNT(po.id) as order_count,\r\n            ROUND(\r\n                COUNT(CASE WHEN po.due_date >= po.created_at THEN 1 END)::numeric / \r\n                NULLIF(COUNT(CASE WHEN po.due_date IS NOT NULL THEN 1 END), 0) * 100, 2\r\n            ) as performance_score\r\n        FROM suppliers s\r\n        LEFT JOIN purchase_orders po ON s.id = po.supplier_id\r\n        WHERE po.created_at IS NULL OR po.created_at::date BETWEEN p_start_date AND p_end_date\r\n        GROUP BY s.id, s.name\r\n        ORDER BY total_spend DESC\r\n        LIMIT 15\r\n    )\r\n    SELECT jsonb_build_object(\r\n        'summary', (\r\n            SELECT jsonb_build_object(\r\n                'total_vendors', vs.total_vendors,\r\n                'active_vendors', vs.active_vendors,\r\n                'total_orders', vs.total_orders,\r\n                'total_amount', vs.total_amount,\r\n                'avg_delivery_days', vs.avg_delivery_days,\r\n                'on_time_delivery_rate', vs.on_time_delivery_rate\r\n            ) FROM vendor_summary vs\r\n        ),\r\n        'top_vendors', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'id', tv.id,\r\n                    'name', tv.name,\r\n                    'total_orders', tv.total_orders,\r\n                    'total_amount', tv.total_amount,\r\n                    'on_time_rate', tv.on_time_rate,\r\n                    'rating', tv.rating\r\n                )\r\n            ) FROM top_vendors tv\r\n        ),\r\n        'monthly_trends', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'month', mt.month,\r\n                    'orders', mt.orders,\r\n                    'amount', mt.amount,\r\n                    'delivery_time', mt.delivery_time\r\n                )\r\n            ) FROM monthly_trends mt\r\n        ),\r\n        'performance_metrics', (\r\n            SELECT jsonb_agg(\r\n                jsonb_build_object(\r\n                    'vendor_name', pm.vendor_name,\r\n                    'total_spend', pm.total_spend,\r\n                    'order_count', pm.order_count,\r\n                    'performance_score', pm.performance_score\r\n                )\r\n            ) FROM performance_metrics pm\r\n        )\r\n    ) INTO vendor_data;\r\n    \r\n    RETURN vendor_data;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_vendor_financial_summary",
    "arguments": "vendor_id uuid",
    "return_type": "TABLE(total_orders bigint, total_purchase_value numeric, total_paid numeric, total_outstanding numeric, current_stock_value numeric, last_payment_date date, average_payment_days numeric, credit_score text)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_vendor_financial_summary(vendor_id uuid)\n RETURNS TABLE(total_orders bigint, total_purchase_value numeric, total_paid numeric, total_outstanding numeric, current_stock_value numeric, last_payment_date date, average_payment_days numeric, credit_score text)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RETURN QUERY\r\n    SELECT \r\n        COUNT(DISTINCT po.id)::bigint as total_orders,\r\n        COALESCE(SUM(po.total), 0),\r\n        COALESCE(SUM(po.paid_amount), 0),\r\n        COALESCE(SUM(po.total - po.paid_amount), 0),\r\n        COALESCE(SUM(ii.quantity * p.cost), 0),\r\n        MAX(vph.payment_date),\r\n        COALESCE(AVG(vph.payment_date - vb.due_date), 0),\r\n        CASE \r\n            WHEN COALESCE(AVG(vph.payment_date - vb.due_date), 0) <= 0 THEN 'Excellent'\r\n            WHEN COALESCE(AVG(vph.payment_date - vb.due_date), 0) <= 7 THEN 'Good'\r\n            WHEN COALESCE(AVG(vph.payment_date - vb.due_date), 0) <= 30 THEN 'Fair'\r\n            ELSE 'Poor'\r\n        END\r\n    FROM suppliers s\r\n    LEFT JOIN purchase_orders po ON s.id = po.supplier_id\r\n    LEFT JOIN vendor_payment_history vph ON s.id = vph.supplier_id\r\n    LEFT JOIN vendor_bills vb ON vph.vendor_bill_id = vb.id\r\n    LEFT JOIN inventory_items ii ON s.id = ii.supplier_id\r\n    LEFT JOIN products p ON ii.product_id = p.id\r\n    WHERE s.id = vendor_id\r\n    GROUP BY s.id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_vendor_performance_details",
    "arguments": "vendor_id_in uuid",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION public.get_vendor_performance_details(vendor_id_in uuid)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    items_sold_count INT;\r\n    in_stock_count INT;\r\n    new_po_count INT;\r\n    amount_pending NUMERIC;\r\n    items_sold_list JSONB;\r\n    in_stock_list JSONB;\r\n    new_pos_list JSONB;\r\nBEGIN\r\n    -- Items sold by this vendor\r\n    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', p.name, 'quantity_sold', sub.total_quantity)), '[]'::jsonb)\r\n    INTO items_sold_list\r\n    FROM (\r\n        SELECT p.name, SUM(soi.quantity) as total_quantity\r\n        FROM public.sales_order_items soi\r\n        JOIN public.products p ON soi.product_id = p.id\r\n        WHERE p.supplier_id = vendor_id_in\r\n        GROUP BY p.name ORDER BY total_quantity DESC LIMIT 10\r\n    ) sub;\r\n    SELECT COALESCE(SUM((item->>'quantity_sold')::int), 0) INTO items_sold_count FROM jsonb_to_recordset(items_sold_list) as item(quantity_sold int);\r\n\r\n    -- Items in stock from this vendor\r\n    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', p.name, 'stock_level', ii.quantity)), '[]'::jsonb)\r\n    INTO in_stock_list\r\n    FROM public.inventory_items ii\r\n    JOIN public.products p ON ii.product_id = p.id\r\n    WHERE p.supplier_id = vendor_id_in ORDER BY ii.quantity ASC LIMIT 10;\r\n    SELECT COALESCE(SUM((item->>'stock_level')::int), 0) INTO in_stock_count FROM jsonb_to_recordset(in_stock_list) as item(stock_level int);\r\n\r\n    -- New & Pending POs\r\n    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', po.id, 'status', po.status, 'total', po.total, 'created_at', po.created_at)), '[]'::jsonb)\r\n    INTO new_pos_list\r\n    FROM public.purchase_orders po\r\n    WHERE po.supplier_id = vendor_id_in AND po.status IN ('pending', 'ordered') ORDER BY po.created_at DESC LIMIT 10;\r\n    SELECT COUNT(*) INTO new_po_count FROM jsonb_array_elements(new_pos_list);\r\n    SELECT COALESCE(SUM((item->>'total')::numeric), 0) INTO amount_pending FROM jsonb_to_recordset(new_pos_list) as item(total numeric);\r\n\r\n    -- Return all metrics as a single JSON object\r\n    RETURN jsonb_build_object(\r\n        'kpis', jsonb_build_object('items_sold', items_sold_count, 'in_stock', in_stock_count, 'new_pos', new_po_count, 'amount_pending', amount_pending),\r\n        'items_sold_list', items_sold_list,\r\n        'in_stock_list', in_stock_list,\r\n        'new_pos_list', new_pos_list\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "get_weekly_sales",
    "arguments": "weeks_limit integer",
    "return_type": "TABLE(week date, total_sales numeric)",
    "definition": "CREATE OR REPLACE FUNCTION public.get_weekly_sales(weeks_limit integer)\n RETURNS TABLE(week date, total_sales numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT\r\n    DATE_TRUNC('week', so.created_at)::DATE AS week,\r\n    -- CORRECT: Calculate sum from sales_order_items\r\n    SUM(soi.quantity * soi.unit_price) AS total_sales\r\n  FROM\r\n    public.sales_orders so\r\n  -- CORRECT: Join with sales_order_items to calculate total\r\n  JOIN\r\n    public.sales_order_items soi ON so.id = soi.order_id\r\n  WHERE\r\n    so.status <> 'draft' AND so.created_at >= NOW() - (weeks_limit || ' weeks')::INTERVAL\r\n  GROUP BY\r\n    week\r\n  ORDER BY\r\n    week ASC;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "mark_as_sold_out",
    "arguments": "p_inventory_item_id uuid, p_reason text, p_notes text, p_adjusted_by uuid",
    "return_type": "boolean",
    "definition": "CREATE OR REPLACE FUNCTION public.mark_as_sold_out(p_inventory_item_id uuid, p_reason text DEFAULT 'Manual sale - not recorded in system'::text, p_notes text DEFAULT NULL::text, p_adjusted_by uuid DEFAULT NULL::uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public', 'pg_temp'\nAS $function$\r\nDECLARE\r\n  current_qty INTEGER;\r\n  _id uuid;\r\nBEGIN\r\n  SELECT quantity INTO current_qty\r\n  FROM inventory_items\r\n  WHERE id = p_inventory_item_id;\r\n\r\n  IF current_qty IS NULL THEN\r\n    RAISE EXCEPTION 'Inventory item not found';\r\n  END IF;\r\n\r\n  IF current_qty = 0 THEN\r\n    RAISE NOTICE 'Item already has zero stock';\r\n    RETURN true;\r\n  END IF;\r\n\r\n  INSERT INTO stock_adjustments (\r\n    inventory_item_id, adjustment_type, quantity_before, quantity_after,\r\n    reason, notes, adjusted_by\r\n  )\r\n  VALUES (\r\n    p_inventory_item_id, 'sale', current_qty, 0,\r\n    p_reason, p_notes, COALESCE(p_adjusted_by, auth.uid())\r\n  )\r\n  RETURNING id INTO _id;\r\n\r\n  RETURN true;\r\nEXCEPTION\r\n  WHEN OTHERS THEN\r\n    RAISE EXCEPTION 'Failed to mark item as sold out: %', SQLERRM;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "mark_messages_as_read",
    "arguments": "p_room_id uuid, p_user_id uuid",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_room_id uuid, p_user_id uuid)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Update the participant's last_read_at timestamp\r\n    UPDATE chat_participants\r\n    SET last_read_at = NOW()\r\n    WHERE room_id = p_room_id AND user_id = p_user_id;\r\n    \r\n    -- Mark notifications as read\r\n    UPDATE chat_notifications\r\n    SET is_read = true\r\n    WHERE room_id = p_room_id AND user_id = p_user_id AND is_read = false;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "migrate_quote_custom_items_configuration",
    "arguments": "",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.migrate_quote_custom_items_configuration()\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    rec RECORD;\r\n    config_data jsonb;\r\nBEGIN\r\n    -- Loop through all existing records with configuration data\r\n    FOR rec IN \r\n        SELECT id, configuration, name \r\n        FROM public.quote_custom_items \r\n        WHERE configuration IS NOT NULL AND configuration != '{}'::jsonb\r\n    LOOP\r\n        config_data := rec.configuration;\r\n        \r\n        -- Update the record with extracted data from configuration\r\n        UPDATE public.quote_custom_items \r\n        SET \r\n            item_type = CASE \r\n                WHEN config_data->'type' = '\"new\"' THEN 'new'\r\n                WHEN config_data->'type' = '\"custom\"' THEN 'customized_existing'\r\n                ELSE 'custom'\r\n            END,\r\n            base_product_name = COALESCE(\r\n                config_data->>'originalProduct',\r\n                config_data->'customization'->>'originalProduct',\r\n                config_data->'productData'->>'name'\r\n            ),\r\n            specifications = COALESCE(\r\n                config_data->>'description',\r\n                config_data->'productData'->>'description',\r\n                'Custom item: ' || rec.name\r\n            ),\r\n            materials = COALESCE(\r\n                config_data->'materials',\r\n                '[]'::jsonb\r\n            ),\r\n            dimensions = config_data->'customization'->>'dimensions',\r\n            finish = config_data->'customization'->>'finish',\r\n            color = config_data->'customization'->>'color',\r\n            custom_instructions = COALESCE(\r\n                config_data->'customization'->>'instructions',\r\n                config_data->>'instructions'\r\n            ),\r\n            notes = config_data->>'notes'\r\n        WHERE id = rec.id;\r\n    END LOOP;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "minimal_test_trigger",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.minimal_test_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Just log that the trigger fired\r\n    RAISE NOTICE 'MINIMAL TRIGGER FIRED for payment: %', NEW.id;\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "optimize_delivery_routes",
    "arguments": "p_optimization_date date, p_max_items_per_route integer, p_max_radius_km numeric",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.optimize_delivery_routes(p_optimization_date date DEFAULT CURRENT_DATE, p_max_items_per_route integer DEFAULT 20, p_max_radius_km numeric DEFAULT 10.0)\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    v_session_id uuid;\r\n    v_delivery_record RECORD;\r\n    v_route_record RECORD;\r\n    v_best_route_id uuid;\r\n    v_min_distance numeric;\r\n    v_current_distance numeric;\r\n    v_total_processed integer := 0;\r\nBEGIN\r\n    -- Create optimization session\r\n    INSERT INTO route_optimization_sessions (\r\n        session_name, \r\n        optimization_date, \r\n        optimization_algorithm,\r\n        status,\r\n        parameters\r\n    ) VALUES (\r\n        'Auto Optimization ' || p_optimization_date,\r\n        p_optimization_date,\r\n        'distance_and_capacity_based',\r\n        'processing',\r\n        jsonb_build_object(\r\n            'max_items_per_route', p_max_items_per_route,\r\n            'max_radius_km', p_max_radius_km\r\n        )\r\n    ) RETURNING id INTO v_session_id;\r\n    \r\n    -- Loop through pending deliveries\r\n    FOR v_delivery_record IN \r\n        SELECT d.*, COUNT(di.id) as item_count, SUM(COALESCE(di.item_weight, 0)) as total_weight\r\n        FROM deliveries d\r\n        LEFT JOIN delivery_items di ON d.id = di.delivery_id\r\n        WHERE d.status = 'pending' \r\n        AND d.route_id IS NULL\r\n        AND d.latitude IS NOT NULL \r\n        AND d.longitude IS NOT NULL\r\n        GROUP BY d.id\r\n        ORDER BY d.latitude, d.longitude\r\n    LOOP\r\n        v_best_route_id := NULL;\r\n        v_min_distance := 999999;\r\n        \r\n        -- Find best existing route\r\n        FOR v_route_record IN\r\n            SELECT dr.*, \r\n                   COUNT(d.id) as current_deliveries,\r\n                   AVG(d.latitude) as avg_lat,\r\n                   AVG(d.longitude) as avg_lon\r\n            FROM delivery_routes dr\r\n            LEFT JOIN deliveries d ON dr.id = d.route_id\r\n            WHERE dr.status = 'assigned' \r\n            AND COALESCE(dr.current_load_items, 0) < p_max_items_per_route\r\n            GROUP BY dr.id\r\n        LOOP\r\n            -- Calculate distance to route center\r\n            v_current_distance := calculate_distance_km(\r\n                v_delivery_record.latitude, v_delivery_record.longitude,\r\n                COALESCE(v_route_record.avg_lat, v_delivery_record.latitude),\r\n                COALESCE(v_route_record.avg_lon, v_delivery_record.longitude)\r\n            );\r\n            \r\n            IF v_current_distance IS NOT NULL AND v_current_distance < v_min_distance AND v_current_distance <= p_max_radius_km THEN\r\n                v_min_distance := v_current_distance;\r\n                v_best_route_id := v_route_record.id;\r\n            END IF;\r\n        END LOOP;\r\n        \r\n        -- If no suitable route found, create new one\r\n        IF v_best_route_id IS NULL THEN\r\n            INSERT INTO delivery_routes (\r\n                route_number,\r\n                driver_id,\r\n                status,\r\n                total_deliveries,\r\n                max_capacity_items,\r\n                created_by\r\n            ) VALUES (\r\n                'AUTO_' || EXTRACT(EPOCH FROM NOW())::bigint,\r\n                (SELECT u.id FROM users u \r\n                 JOIN roles r ON u.role_id = r.id \r\n                 WHERE r.name = 'Delivery Driver' \r\n                 LIMIT 1),\r\n                'assigned',\r\n                0,\r\n                p_max_items_per_route,\r\n                (SELECT id FROM users WHERE email = 'system@alrams.com' LIMIT 1)\r\n            ) RETURNING id INTO v_best_route_id;\r\n        END IF;\r\n        \r\n        -- Assign delivery to route\r\n        UPDATE deliveries \r\n        SET route_id = v_best_route_id,\r\n            updated_at = now()\r\n        WHERE id = v_delivery_record.id;\r\n        \r\n        -- Update route totals\r\n        UPDATE delivery_routes \r\n        SET \r\n            total_deliveries = total_deliveries + 1,\r\n            updated_at = now()\r\n        WHERE id = v_best_route_id;\r\n        \r\n        v_total_processed := v_total_processed + 1;\r\n        \r\n    END LOOP;\r\n    \r\n    -- Mark session as completed\r\n    UPDATE route_optimization_sessions \r\n    SET \r\n        status = 'completed', \r\n        completed_at = NOW(),\r\n        total_orders = v_total_processed\r\n    WHERE id = v_session_id;\r\n    \r\n    RETURN v_session_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "post_journal_entry",
    "arguments": "journal_entry_id_param uuid, posted_by_param uuid",
    "return_type": "boolean",
    "definition": "CREATE OR REPLACE FUNCTION public.post_journal_entry(journal_entry_id_param uuid, posted_by_param uuid DEFAULT NULL::uuid)\n RETURNS boolean\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    je_record RECORD;\r\n    line_record RECORD;\r\n    is_balanced BOOLEAN := FALSE;\r\nBEGIN\r\n    -- Check if journal entry exists and is balanced\r\n    SELECT \r\n        je.*,\r\n        (ABS(COALESCE(total_debit, 0) - COALESCE(total_credit, 0)) < 0.01) as balanced\r\n    INTO je_record\r\n    FROM journal_entries je\r\n    WHERE je.id = journal_entry_id_param;\r\n    \r\n    IF NOT FOUND THEN\r\n        RAISE EXCEPTION 'Journal entry not found';\r\n    END IF;\r\n    \r\n    IF je_record.status != 'DRAFT' THEN\r\n        RAISE EXCEPTION 'Journal entry is not in DRAFT status';\r\n    END IF;\r\n    \r\n    IF NOT je_record.balanced THEN\r\n        RAISE EXCEPTION 'Journal entry is not balanced. Debits: %, Credits: %', \r\n            je_record.total_debit, je_record.total_credit;\r\n    END IF;\r\n    \r\n    -- Post lines to general ledger\r\n    FOR line_record IN \r\n        SELECT * FROM journal_entry_lines \r\n        WHERE journal_entry_id = journal_entry_id_param\r\n    LOOP\r\n        INSERT INTO general_ledger (\r\n            account_id,\r\n            journal_entry_id,\r\n            journal_line_id,\r\n            transaction_date,\r\n            posting_date,\r\n            description,\r\n            reference,\r\n            debit_amount,\r\n            credit_amount,\r\n            running_balance\r\n        ) VALUES (\r\n            line_record.account_id,\r\n            journal_entry_id_param,\r\n            line_record.id,\r\n            je_record.entry_date,\r\n            CURRENT_DATE,\r\n            COALESCE(line_record.description, je_record.description),\r\n            je_record.reference_number,\r\n            line_record.debit_amount,\r\n            line_record.credit_amount,\r\n            calculate_account_balance(line_record.account_id)\r\n        );\r\n    END LOOP;\r\n    \r\n    -- Update journal entry status\r\n    UPDATE journal_entries \r\n    SET \r\n        status = 'POSTED'::journal_status,\r\n        posted_by = posted_by_param,\r\n        posted_at = CURRENT_TIMESTAMP\r\n    WHERE id = journal_entry_id_param;\r\n    \r\n    -- Update account balances\r\n    UPDATE chart_of_accounts \r\n    SET current_balance = calculate_account_balance(id)\r\n    WHERE id IN (\r\n        SELECT DISTINCT account_id \r\n        FROM journal_entry_lines \r\n        WHERE journal_entry_id = journal_entry_id_param\r\n    );\r\n    \r\n    RETURN TRUE;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "reconcile_bank_transaction",
    "arguments": "bank_transaction_id_param uuid, payment_id_param uuid, vendor_payment_id_param uuid",
    "return_type": "boolean",
    "definition": "CREATE OR REPLACE FUNCTION public.reconcile_bank_transaction(bank_transaction_id_param uuid, payment_id_param uuid DEFAULT NULL::uuid, vendor_payment_id_param uuid DEFAULT NULL::uuid)\n RETURNS boolean\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    bt_record RECORD;\r\n    reference_val TEXT;\r\nBEGIN\r\n    -- Get bank transaction details\r\n    SELECT * INTO bt_record\r\n    FROM bank_transactions\r\n    WHERE id = bank_transaction_id_param;\r\n    \r\n    IF NOT FOUND THEN\r\n        RAISE EXCEPTION 'Bank transaction not found';\r\n    END IF;\r\n    \r\n    -- Set reference based on payment type\r\n    IF payment_id_param IS NOT NULL THEN\r\n        SELECT reference INTO reference_val\r\n        FROM payments\r\n        WHERE id = payment_id_param;\r\n        \r\n        -- Update payment reference if needed\r\n        UPDATE payments \r\n        SET reference = bt_record.reference\r\n        WHERE id = payment_id_param AND (reference IS NULL OR reference = '');\r\n        \r\n    ELSIF vendor_payment_id_param IS NOT NULL THEN\r\n        SELECT reference_number INTO reference_val\r\n        FROM vendor_payment_history\r\n        WHERE id = vendor_payment_id_param;\r\n        \r\n        -- Update vendor payment reference if needed\r\n        UPDATE vendor_payment_history \r\n        SET reference_number = bt_record.reference\r\n        WHERE id = vendor_payment_id_param AND (reference_number IS NULL OR reference_number = '');\r\n    END IF;\r\n    \r\n    RETURN TRUE;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "refresh_analytics_views",
    "arguments": "",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.refresh_analytics_views()\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    REFRESH MATERIALIZED VIEW mv_daily_sales_summary;\r\n    REFRESH MATERIALIZED VIEW mv_product_performance;\r\n    \r\n    -- Insert analytics snapshot\r\n    INSERT INTO analytics_snapshots (snapshot_date, metric_type, metrics)\r\n    VALUES (\r\n        CURRENT_DATE,\r\n        'daily_refresh',\r\n        jsonb_build_object(\r\n            'refreshed_at', NOW(),\r\n            'views_refreshed', ARRAY['mv_daily_sales_summary', 'mv_product_performance']\r\n        )\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "refresh_comprehensive_analytics",
    "arguments": "",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.refresh_comprehensive_analytics()\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Refresh existing analytics views if they exist\r\n    PERFORM refresh_analytics_views();\r\n    \r\n    -- Update analytics snapshots\r\n    INSERT INTO analytics_snapshots (snapshot_date, metric_type, dimensions, metrics)\r\n    SELECT \r\n        CURRENT_DATE,\r\n        'daily_snapshot',\r\n        jsonb_build_object('date', CURRENT_DATE),\r\n        get_business_summary(CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE)\r\n    ON CONFLICT DO NOTHING;\r\n    \r\n    -- Clean old snapshots (keep last 90 days)\r\n    DELETE FROM analytics_snapshots \r\n    WHERE snapshot_date < (CURRENT_DATE - INTERVAL '90 days');\r\n    \r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "set_receipt_number",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.set_receipt_number()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN\r\n    NEW.receipt_number := generate_receipt_number();\r\n  END IF;\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "set_updated_at",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.set_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.sync_bank_account_to_chart_of_accounts()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    cash_account_id UUID;\r\n    ar_account_id UUID;\r\n    journal_id UUID;\r\n    bank_account_name TEXT;\r\n    transaction_amount DECIMAL;\r\n    is_deposit BOOLEAN;\r\nBEGIN\r\n    -- Determine if this is a deposit or withdrawal\r\n    IF TG_OP = 'INSERT' THEN\r\n        is_deposit := (NEW.type = 'deposit' OR NEW.type = 'credit' OR NEW.type = 'CREDIT');\r\n        transaction_amount := NEW.amount;\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = NEW.bank_account_id;\r\n        \r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        -- For updates, calculate the difference\r\n        is_deposit := ((NEW.type = 'deposit' OR NEW.type = 'credit' OR NEW.type = 'CREDIT') AND \r\n                      (OLD.type != 'deposit' AND OLD.type != 'credit' AND OLD.type != 'CREDIT')) OR\r\n                     (NEW.amount > OLD.amount);\r\n        transaction_amount := ABS(NEW.amount - OLD.amount);\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = NEW.bank_account_id;\r\n        \r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- For deletes, reverse the transaction\r\n        is_deposit := NOT (OLD.type = 'deposit' OR OLD.type = 'credit' OR OLD.type = 'CREDIT');\r\n        transaction_amount := OLD.amount;\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = OLD.bank_account_id;\r\n    END IF;\r\n    \r\n    -- Skip if amount is zero\r\n    IF transaction_amount IS NULL OR transaction_amount = 0 THEN\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Get Cash account from chart of accounts (account code 1010)\r\n    SELECT id INTO cash_account_id \r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1010', '1001') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    -- Get Accounts Receivable account (account code 1200) for contra entry\r\n    SELECT id INTO ar_account_id \r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1200', '1100') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    -- Skip if cash account not found\r\n    IF cash_account_id IS NULL THEN\r\n        RAISE WARNING 'Cash account (1010/1001) not found in chart of accounts. Skipping bank transaction sync.';\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Skip if AR account not found  \r\n    IF ar_account_id IS NULL THEN\r\n        RAISE WARNING 'Accounts Receivable account (1200/1100) not found in chart of accounts. Skipping bank transaction sync.';\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Create journal entry to sync bank transaction with chart of accounts\r\n    journal_id := create_journal_entry(\r\n        COALESCE(NEW.date::date, OLD.date::date, CURRENT_DATE),\r\n        CASE \r\n            WHEN TG_OP = 'DELETE' THEN 'Reversal - Bank transaction deleted from ' || COALESCE(bank_account_name, 'Bank Account')\r\n            WHEN is_deposit THEN 'Bank deposit to ' || COALESCE(bank_account_name, 'Bank Account')\r\n            ELSE 'Bank withdrawal from ' || COALESCE(bank_account_name, 'Bank Account')\r\n        END,\r\n        CASE \r\n            WHEN TG_OP = 'INSERT' THEN 'BT-' || NEW.id::text\r\n            WHEN TG_OP = 'UPDATE' THEN 'BT-UPD-' || NEW.id::text  \r\n            ELSE 'BT-DEL-' || OLD.id::text\r\n        END\r\n    );\r\n    \r\n    IF is_deposit THEN\r\n        -- For deposits: Debit Cash (increase asset), Credit AR (decrease receivable)\r\n        PERFORM add_journal_entry_line(journal_id, cash_account_id, transaction_amount, 0, 'Cash received');\r\n        PERFORM add_journal_entry_line(journal_id, ar_account_id, 0, transaction_amount, 'Bank deposit applied');\r\n    ELSE\r\n        -- For withdrawals: Credit Cash (decrease asset), Debit AR (increase receivable)  \r\n        PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, transaction_amount, 'Cash paid');\r\n        PERFORM add_journal_entry_line(journal_id, ar_account_id, transaction_amount, 0, 'Bank withdrawal');\r\n    END IF;\r\n    \r\n    -- Post the journal entry to update chart of accounts balances\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\n    \r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the bank transaction\r\n        RAISE WARNING 'Failed to sync bank transaction to chart of accounts: %', SQLERRM;\r\n        RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "sync_existing_bank_balances_to_chart",
    "arguments": "",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION public.sync_existing_bank_balances_to_chart()\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    bank_rec RECORD;\r\n    cash_account_id UUID;\r\n    total_bank_balance DECIMAL := 0;\r\n    cash_account_current_balance DECIMAL := 0;\r\n    balance_difference DECIMAL;\r\n    journal_id UUID;\r\n    sync_count INTEGER := 0;\r\nBEGIN\r\n    -- Get Cash account from chart of accounts\r\n    SELECT id, current_balance INTO cash_account_id, cash_account_current_balance\r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1010', '1001') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    IF cash_account_id IS NULL THEN\r\n        RETURN 'ERROR: Cash account (1010/1001) not found in chart of accounts';\r\n    END IF;\r\n    \r\n    -- Calculate total current balance from all bank accounts\r\n    SELECT COALESCE(SUM(current_balance), 0) INTO total_bank_balance\r\n    FROM bank_accounts \r\n    WHERE account_type IN ('BANK', 'UPI');\r\n    \r\n    -- Calculate the difference\r\n    balance_difference := total_bank_balance - COALESCE(cash_account_current_balance, 0);\r\n    \r\n    -- If there's a significant difference, create adjustment journal entry\r\n    IF ABS(balance_difference) > 0.01 THEN\r\n        -- Create adjustment journal entry\r\n        journal_id := create_journal_entry(\r\n            CURRENT_DATE,\r\n            'Bank balance synchronization adjustment',\r\n            'SYNC-' || EXTRACT(EPOCH FROM NOW())::text\r\n        );\r\n        \r\n        IF balance_difference > 0 THEN\r\n            -- Bank accounts have more money than chart shows - increase cash\r\n            PERFORM add_journal_entry_line(journal_id, cash_account_id, balance_difference, 0, 'Bank balance sync - increase cash');\r\n            -- Find an appropriate contra account (using retained earnings or opening balance equity)\r\n            PERFORM add_journal_entry_line(journal_id, \r\n                (SELECT id FROM chart_of_accounts WHERE account_code IN ('3900', '3000') ORDER BY account_code LIMIT 1), \r\n                0, balance_difference, 'Opening balance adjustment');\r\n        ELSE\r\n            -- Chart shows more cash than bank accounts - decrease cash\r\n            PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, ABS(balance_difference), 'Bank balance sync - decrease cash');\r\n            -- Contra to opening balance equity\r\n            PERFORM add_journal_entry_line(journal_id, \r\n                (SELECT id FROM chart_of_accounts WHERE account_code IN ('3900', '3000') ORDER BY account_code LIMIT 1), \r\n                ABS(balance_difference), 0, 'Opening balance adjustment');\r\n        END IF;\r\n        \r\n        -- Post the journal entry\r\n        PERFORM post_journal_entry(journal_id);\r\n        sync_count := 1;\r\n    END IF;\r\n    \r\n    RETURN FORMAT('SUCCESS: Synced bank balances. Total bank: %s, Chart cash: %s, Difference: %s, Adjustments: %s', \r\n                  total_bank_balance, cash_account_current_balance, balance_difference, sync_count);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "test_payment_trigger",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.test_payment_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    RAISE NOTICE 'TEST TRIGGER FIRED: Payment ID = %, Amount = %', NEW.id, NEW.amount;\r\n    INSERT INTO journal_entries (entry_date, description, reference_number, total_debit, total_credit, status)\r\n    VALUES (CURRENT_DATE, 'Test trigger entry', 'TEST-' || NEW.id::text, 0, 0, 'DRAFT');\r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        RAISE WARNING 'Test trigger failed: %', SQLERRM;\r\n        RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_analytics_update",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_analytics_update()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Schedule a refresh of analytics views (in a real implementation, this would be queued)\r\n    PERFORM pg_notify('analytics_refresh', 'scheduled');\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_audit_financial_transaction",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_audit_financial_transaction()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- This can be extended to log to an audit table\r\n    -- For now, just ensure created_at is set\r\n    IF TG_OP = 'INSERT' THEN\r\n        IF NEW.created_at IS NULL THEN\r\n            NEW.created_at = CURRENT_TIMESTAMP;\r\n        END IF;\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_create_opening_balance",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_create_opening_balance()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Create opening balance entry if opening_balance is set\r\n    IF NEW.opening_balance IS NOT NULL AND NEW.opening_balance != 0 THEN\r\n        INSERT INTO opening_balances (\r\n            account_id,\r\n            opening_date,\r\n            debit_amount,\r\n            credit_amount\r\n        ) VALUES (\r\n            NEW.id,\r\n            CURRENT_DATE,\r\n            CASE WHEN NEW.normal_balance = 'DEBIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END,\r\n            CASE WHEN NEW.normal_balance = 'CREDIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END\r\n        )\r\n        ON CONFLICT (account_id) DO UPDATE SET\r\n            debit_amount = CASE WHEN NEW.normal_balance = 'DEBIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END,\r\n            credit_amount = CASE WHEN NEW.normal_balance = 'CREDIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_create_purchase_journal_entry",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_create_purchase_journal_entry()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    inventory_account_id UUID;\r\n    ap_account_id UUID;\r\n    journal_id UUID;\r\n    supplier_name TEXT;\r\nBEGIN\r\n    -- Skip if no total amount\r\n    IF NEW.total IS NULL OR NEW.total = 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get account IDs with flexible lookup\r\n    SELECT id INTO inventory_account_id FROM chart_of_accounts WHERE account_code IN ('1300', '1350', '1320') ORDER BY account_code LIMIT 1;\r\n    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code IN ('2010', '2000') ORDER BY account_code LIMIT 1;\r\n    \r\n    -- Skip if accounts not found but log warning\r\n    IF inventory_account_id IS NULL OR ap_account_id IS NULL THEN\r\n        RAISE WARNING 'Required accounts not found for purchase journal entry: Inventory=%, AP=%. Available codes: %', \r\n            inventory_account_id, ap_account_id,\r\n            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1300','1350','1320','2010','2000'));\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get supplier name\r\n    IF NEW.supplier_id IS NOT NULL THEN\r\n        SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;\r\n    END IF;\r\n    \r\n    -- Create journal entry for purchase\r\n    journal_id := create_journal_entry(\r\n        COALESCE(NEW.due_date, CURRENT_DATE),\r\n        'Purchase from ' || COALESCE(supplier_name, 'Supplier'),\r\n        'PO-' || NEW.id::text\r\n    );\r\n    \r\n    -- Debit Inventory (increase asset)\r\n    PERFORM add_journal_entry_line(journal_id, inventory_account_id, NEW.total, 0, 'Inventory purchased');\r\n    \r\n    -- Credit Accounts Payable (increase liability)\r\n    PERFORM add_journal_entry_line(journal_id, ap_account_id, 0, NEW.total, 'Amount owed to supplier');\r\n    \r\n    -- Post the journal entry\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the purchase order\r\n        RAISE WARNING 'Failed to create journal entry for purchase order %: %', NEW.id, SQLERRM;\r\n        RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_create_sales_journal_entry",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_create_sales_journal_entry()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    ar_account_id UUID;\r\n    sales_account_id UUID;\r\n    journal_id UUID;\r\n    customer_name TEXT;\r\n    amount_to_record DECIMAL;\r\nBEGIN\r\n    -- Determine amount to record with better logic\r\n    amount_to_record := COALESCE(NEW.final_price, NEW.total, NEW.total_price, NEW.grand_total, 0);\r\n    \r\n    -- Skip if total is null or zero\r\n    IF amount_to_record IS NULL OR amount_to_record = 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get account IDs with flexible lookup\r\n    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code IN ('1200', '1100') ORDER BY account_code LIMIT 1;\r\n    SELECT id INTO sales_account_id FROM chart_of_accounts WHERE account_code IN ('4010', '4000', '4001') ORDER BY account_code LIMIT 1;\r\n    \r\n    -- Skip if accounts not found but log warning\r\n    IF ar_account_id IS NULL OR sales_account_id IS NULL THEN\r\n        RAISE WARNING 'Required accounts not found for sales journal entry: AR=%, Sales=%. Available codes: %', \r\n            ar_account_id, sales_account_id,\r\n            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1200','1100','4010','4000','4001'));\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get customer name\r\n    customer_name := COALESCE(NEW.customer_name, 'Customer');\r\n    \r\n    -- Create journal entry for sale\r\n    journal_id := create_journal_entry(\r\n        CURRENT_DATE,\r\n        'Sale to ' || customer_name,\r\n        CASE \r\n            WHEN TG_TABLE_NAME = 'sales_orders' THEN 'SO-' || NEW.id::text\r\n            WHEN TG_TABLE_NAME = 'invoices' THEN 'INV-' || NEW.id::text\r\n            ELSE 'SALE-' || NEW.id::text\r\n        END\r\n    );\r\n    \r\n    -- Debit Accounts Receivable (increase asset)\r\n    PERFORM add_journal_entry_line(journal_id, ar_account_id, amount_to_record, 0, 'Invoice created');\r\n    \r\n    -- Credit Sales Revenue (increase revenue)\r\n    PERFORM add_journal_entry_line(journal_id, sales_account_id, 0, amount_to_record, 'Sales revenue');\r\n    \r\n    -- Post the journal entry\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the sale\r\n        RAISE WARNING 'Failed to create journal entry for sale %: %', NEW.id, SQLERRM;\r\n        RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_create_vendor_payment_journal_entry",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_create_vendor_payment_journal_entry()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    cash_account_id UUID;\r\n    ap_account_id UUID;\r\n    journal_id UUID;\r\n    supplier_name TEXT;\r\n    payment_amount DECIMAL;\r\nBEGIN\r\n    -- Determine payment amount (handle different column names)\r\n    payment_amount := COALESCE(NEW.amount_paid, NEW.amount, 0);\r\n    \r\n    -- Skip if amount is null or zero\r\n    IF payment_amount IS NULL OR payment_amount = 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Skip if payment is not completed (if status field exists)\r\n    IF NEW.status IS NOT NULL AND NEW.status != 'completed' THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get account IDs with flexible lookup\r\n    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code IN ('1001', '1010') ORDER BY account_code LIMIT 1;\r\n    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code IN ('2010', '2000') ORDER BY account_code LIMIT 1;\r\n    \r\n    -- Skip if accounts not found but log warning\r\n    IF cash_account_id IS NULL OR ap_account_id IS NULL THEN\r\n        RAISE WARNING 'Required accounts not found for vendor payment journal entry: Cash=%, AP=%. Available codes: %', \r\n            cash_account_id, ap_account_id,\r\n            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1001','1010','2010','2000'));\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get supplier name\r\n    IF NEW.supplier_id IS NOT NULL THEN\r\n        SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;\r\n    END IF;\r\n    \r\n    -- Create journal entry for vendor payment\r\n    journal_id := create_journal_entry(\r\n        COALESCE(NEW.payment_date, CURRENT_DATE),\r\n        'Payment to ' || COALESCE(supplier_name, 'Supplier'),\r\n        'VP-' || NEW.id::text\r\n    );\r\n    \r\n    -- Debit Accounts Payable (decrease liability)\r\n    PERFORM add_journal_entry_line(journal_id, ap_account_id, payment_amount, 0, 'Payment to supplier');\r\n    \r\n    -- Credit Cash (decrease asset)\r\n    PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, payment_amount, 'Cash paid');\r\n    \r\n    -- Post the journal entry\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the payment\r\n        RAISE WARNING 'Failed to create journal entry for vendor payment %: %', NEW.id, SQLERRM;\r\n        RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_update_account_balance",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_update_account_balance()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    affected_account_id UUID;\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        affected_account_id := NEW.account_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        affected_account_id := OLD.account_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    -- Update account balance\r\n    UPDATE chart_of_accounts \r\n    SET \r\n        current_balance = calculate_account_balance(affected_account_id),\r\n        updated_at = CURRENT_TIMESTAMP\r\n    WHERE id = affected_account_id;\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_update_invoice_payment_status",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_update_invoice_payment_status()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        -- Update for new/updated payment\r\n        IF NEW.invoice_id IS NOT NULL THEN\r\n            PERFORM update_invoice_payment_status(NEW.invoice_id);\r\n        END IF;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- Update for deleted payment\r\n        IF OLD.invoice_id IS NOT NULL THEN\r\n            PERFORM update_invoice_payment_status(OLD.invoice_id);\r\n        END IF;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    RETURN NULL;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_update_journal_totals",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_update_journal_totals()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    je_id UUID;\r\nBEGIN\r\n    -- Get journal entry ID\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        je_id := NEW.journal_entry_id;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        je_id := OLD.journal_entry_id;\r\n    END IF;\r\n    \r\n    -- Update journal entry totals\r\n    UPDATE journal_entries \r\n    SET \r\n        total_debit = (\r\n            SELECT COALESCE(SUM(debit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = je_id\r\n        ),\r\n        total_credit = (\r\n            SELECT COALESCE(SUM(credit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = je_id\r\n        ),\r\n        updated_at = CURRENT_TIMESTAMP\r\n    WHERE id = je_id;\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_update_po_payment_status",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_update_po_payment_status()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        -- Update for new/updated vendor payment\r\n        IF NEW.purchase_order_id IS NOT NULL THEN\r\n            PERFORM update_purchase_order_payment_status(NEW.purchase_order_id);\r\n        END IF;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- Update for deleted vendor payment\r\n        IF OLD.purchase_order_id IS NOT NULL THEN\r\n            PERFORM update_purchase_order_payment_status(OLD.purchase_order_id);\r\n        END IF;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    RETURN NULL;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_update_timestamp",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_update_timestamp()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    NEW.updated_at = CURRENT_TIMESTAMP;\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_validate_account_usage",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_validate_account_usage()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    account_info RECORD;\r\nBEGIN\r\n    -- Get account information\r\n    SELECT account_type, is_active INTO account_info\r\n    FROM chart_of_accounts\r\n    WHERE id = NEW.account_id;\r\n    \r\n    -- Validate account is active\r\n    IF NOT account_info.is_active THEN\r\n        RAISE EXCEPTION 'Cannot post to inactive account';\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "trigger_validate_journal_balance",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.trigger_validate_journal_balance()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Only validate when status changes to POSTED\r\n    IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN\r\n        IF ABS(COALESCE(NEW.total_debit, 0) - COALESCE(NEW.total_credit, 0)) > 0.01 THEN\r\n            RAISE EXCEPTION 'Cannot post unbalanced journal entry. Debits: %, Credits: %', \r\n                NEW.total_debit, NEW.total_credit;\r\n        END IF;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_account_balance",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_account_balance()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  IF TG_OP = 'INSERT' THEN\r\n    UPDATE chart_of_accounts \r\n    SET current_balance = CASE \r\n      WHEN normal_balance = 'DEBIT' \r\n      THEN current_balance + NEW.debit_amount - NEW.credit_amount\r\n      ELSE current_balance + NEW.credit_amount - NEW.debit_amount\r\n    END,\r\n    updated_at = NOW()\r\n    WHERE id = NEW.account_id;\r\n    \r\n    RETURN NEW;\r\n  ELSIF TG_OP = 'DELETE' THEN\r\n    UPDATE chart_of_accounts \r\n    SET current_balance = CASE \r\n      WHEN normal_balance = 'DEBIT' \r\n      THEN current_balance - OLD.debit_amount + OLD.credit_amount\r\n      ELSE current_balance - OLD.credit_amount + OLD.debit_amount\r\n    END,\r\n    updated_at = NOW()\r\n    WHERE id = OLD.account_id;\r\n    \r\n    RETURN OLD;\r\n  END IF;\r\n  \r\n  RETURN NULL;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_bank_balance",
    "arguments": "account_id uuid, delta numeric",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.update_bank_balance(account_id uuid, delta numeric)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nbegin\r\n  update bank_accounts\r\n  set current_balance = current_balance + delta\r\n  where id = account_id;\r\nend;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_chat_room_last_message",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_chat_room_last_message()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    IF TG_OP = 'INSERT' THEN\r\n        UPDATE chat_rooms \r\n        SET last_message_at = NEW.sent_at\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        UPDATE chat_rooms \r\n        SET last_message_at = NEW.sent_at\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    END IF;\r\n    RETURN NULL;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_chat_room_participant_count",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_chat_room_participant_count()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    IF TG_OP = 'INSERT' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = NEW.room_id AND is_active = true\r\n        )\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = NEW.room_id AND is_active = true\r\n        )\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = OLD.room_id AND is_active = true\r\n        )\r\n        WHERE id = OLD.room_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    RETURN NULL;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_delivery_item_weight",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_delivery_item_weight()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Update total_weight when unit_weight or quantity changes\r\n    NEW.total_weight := COALESCE(NEW.unit_weight, 0) * COALESCE(NEW.quantity_to_deliver, 1);\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_delivery_status_from_items",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_delivery_status_from_items()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  -- Update delivery status based on item statuses\r\n  -- Implementation depends on business logic\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_delivery_total_items",
    "arguments": "delivery_id uuid, total_items_count integer",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.update_delivery_total_items(delivery_id uuid, total_items_count integer)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  UPDATE deliveries \r\n  SET total_items = total_items_count\r\n  WHERE deliveries.id = delivery_id;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_inventory_on_receipt",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_inventory_on_receipt()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n  po_record record;\r\n  inventory_record record;\r\n  new_inventory_id uuid;\r\nBEGIN\r\n  SELECT po.*, poi.product_id, poi.item_name, poi.specifications\r\n  INTO po_record\r\n  FROM purchase_orders po\r\n  LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id\r\n  WHERE po.id = NEW.purchase_order_id\r\n  LIMIT 1;\r\n\r\n  IF NEW.inspection_status IN ('passed', 'pending') THEN\r\n    IF po_record.is_custom THEN\r\n      INSERT INTO inventory_items (\r\n        product_id, category, subcategory, material, location,\r\n        quantity, reorder_point, supplier_id, updated_at\r\n      ) VALUES (\r\n        NULL, 'Custom', COALESCE(po_record.custom_type, 'custom'), 'Custom Material',\r\n        NEW.storage_location, NEW.received_quantity, 1,\r\n        po_record.supplier_id, now()\r\n      ) RETURNING id INTO new_inventory_id;\r\n\r\n    ELSE\r\n      SELECT * INTO inventory_record\r\n      FROM inventory_items\r\n      WHERE product_id = po_record.product_id\r\n        AND supplier_id = po_record.supplier_id\r\n      LIMIT 1;\r\n\r\n      IF inventory_record.id IS NOT NULL THEN\r\n        UPDATE inventory_items\r\n        SET quantity = quantity + NEW.received_quantity,\r\n            location = COALESCE(NEW.storage_location, location),\r\n            updated_at = now()\r\n        WHERE id = inventory_record.id;\r\n\r\n        new_inventory_id := inventory_record.id;\r\n      ELSE\r\n        INSERT INTO inventory_items (\r\n          product_id, category, subcategory, material, location,\r\n          quantity, reorder_point, supplier_id, updated_at\r\n        ) VALUES (\r\n          po_record.product_id, 'Regular', 'Standard', 'Standard Material',\r\n          NEW.storage_location, NEW.received_quantity, 5,\r\n          po_record.supplier_id, now()\r\n        ) RETURNING id INTO new_inventory_id;\r\n      END IF;\r\n    END IF;\r\n\r\n    INSERT INTO stock_adjustments (\r\n      inventory_item_id, adjustment_type, quantity_before,\r\n      quantity_after, quantity_change, reason, notes,\r\n      adjusted_by, adjusted_at\r\n    ) VALUES (\r\n      new_inventory_id, 'received', COALESCE(inventory_record.quantity, 0),\r\n      COALESCE(inventory_record.quantity, 0) + NEW.received_quantity,\r\n      NEW.received_quantity,\r\n      'Purchase Order Receipt - ' || NEW.receipt_number,\r\n      CONCAT(\r\n        'PO: ', po_record.id,\r\n        '\\nLocation: ', NEW.storage_location,\r\n        '\\nInspection: ', NEW.inspection_status,\r\n        CASE WHEN NEW.condition_notes IS NOT NULL\r\n          THEN '\\nNotes: ' || NEW.condition_notes ELSE '' END\r\n      ),\r\n      NEW.received_by,\r\n      NEW.received_at\r\n    );\r\n\r\n    UPDATE purchase_orders\r\n    SET status = 'received', updated_at = now()\r\n    WHERE id = NEW.purchase_order_id\r\n      AND status != 'received';\r\n  END IF;\r\n\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_invoice_payment_status",
    "arguments": "invoice_id_param uuid",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.update_invoice_payment_status(invoice_id_param uuid)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    total_amount NUMERIC;\r\n    calculated_paid_amount NUMERIC;  -- Renamed to avoid ambiguity\r\n    new_status TEXT;\r\nBEGIN\r\n    -- Get invoice total and calculate paid amount\r\n    SELECT i.total INTO total_amount\r\n    FROM invoices i\r\n    WHERE i.id = invoice_id_param;\r\n    \r\n    SELECT COALESCE(SUM(p.amount), 0) INTO calculated_paid_amount\r\n    FROM payments p\r\n    WHERE p.invoice_id = invoice_id_param;\r\n    \r\n    -- Determine new status\r\n    IF calculated_paid_amount = 0 THEN\r\n        new_status := 'unpaid';\r\n    ELSIF calculated_paid_amount >= total_amount THEN\r\n        new_status := 'paid';\r\n    ELSE\r\n        new_status := 'unpaid'; -- Partial payment still considered unpaid\r\n    END IF;\r\n    \r\n    -- Update invoice with qualified column reference\r\n    UPDATE invoices \r\n    SET \r\n        paid_amount = calculated_paid_amount,  -- Fixed: use variable name\r\n        status = new_status::invoice_status\r\n    WHERE id = invoice_id_param;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_purchase_order_payment_status",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_purchase_order_payment_status()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    UPDATE purchase_orders \r\n    SET payment_status = CASE \r\n        WHEN paid_amount = 0 THEN 'unpaid'\r\n        WHEN paid_amount >= total THEN 'paid'\r\n        WHEN paid_amount > 0 AND paid_amount < total THEN 'partially_paid'\r\n        ELSE payment_status\r\n    END\r\n    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);\r\n\r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_purchase_order_payment_status",
    "arguments": "po_id_param uuid",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.update_purchase_order_payment_status(po_id_param uuid)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    total_amount NUMERIC;\r\n    calculated_paid_amount NUMERIC;  -- Renamed to avoid ambiguity\r\n    new_status TEXT;\r\nBEGIN\r\n    -- Get purchase order total and calculate paid amount\r\n    SELECT po.total INTO total_amount\r\n    FROM purchase_orders po\r\n    WHERE po.id = po_id_param;\r\n    \r\n    SELECT COALESCE(SUM(vph.amount), 0) INTO calculated_paid_amount\r\n    FROM vendor_payment_history vph\r\n    WHERE vph.purchase_order_id = po_id_param;\r\n    \r\n    -- Determine new status\r\n    IF calculated_paid_amount = 0 THEN\r\n        new_status := 'unpaid';\r\n    ELSIF calculated_paid_amount >= total_amount THEN\r\n        new_status := 'paid';\r\n    ELSE\r\n        new_status := 'partial';\r\n    END IF;\r\n    \r\n    -- Update purchase order with qualified column reference\r\n    UPDATE purchase_orders \r\n    SET \r\n        paid_amount = calculated_paid_amount,  -- Fixed: use variable name\r\n        payment_status = new_status::payment_status\r\n    WHERE id = po_id_param;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_quote_with_items",
    "arguments": "quote_id_in uuid, update_data_in jsonb, items_in jsonb",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION public.update_quote_with_items(quote_id_in uuid, update_data_in jsonb, items_in jsonb)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n  custom_item_ids_in_payload UUID[];\r\n  item_data jsonb;\r\nBEGIN\r\n  -- 1. Update the main quote record with new data and the new items array\r\n  UPDATE quotes\r\n  SET\r\n    customer_id = (update_data_in->>'customer_id')::uuid,\r\n    customer = update_data_in->'customer',\r\n    total_price = (update_data_in->>'total_price')::numeric,\r\n    status = update_data_in->>'status',\r\n    items = items_in -- Update the JSONB field\r\n  WHERE id = quote_id_in;\r\n\r\n  -- 2. Get all IDs of custom items from the incoming payload\r\n  SELECT array_agg((item->>'id')::uuid)\r\n  INTO custom_item_ids_in_payload\r\n  FROM jsonb_array_elements(items_in) AS item\r\n  WHERE item->>'type' = 'custom' AND item->>'id' IS NOT NULL;\r\n\r\n  -- 3. Delete custom items that are no longer in the quote\r\n  DELETE FROM quote_custom_items\r\n  WHERE quote_id = quote_id_in\r\n    AND id <> ALL(COALESCE(custom_item_ids_in_payload, ARRAY[]::UUID[]));\r\n\r\n  -- 4. Loop through incoming items and perform UPSERT (Insert or Update)\r\n  FOR item_data IN SELECT * FROM jsonb_array_elements(items_in)\r\n  LOOP\r\n    IF item_data->>'type' = 'custom' THEN\r\n      INSERT INTO quote_custom_items (\r\n        id,\r\n        quote_id,\r\n        name,\r\n        quantity,\r\n        unit_price,\r\n        configuration,\r\n        product_id,\r\n        supplier_id,\r\n        supplier_name\r\n      )\r\n      VALUES (\r\n        COALESCE((item_data->>'id')::uuid, gen_random_uuid()),\r\n        quote_id_in,\r\n        item_data->>'name',\r\n        (item_data->>'quantity')::int,\r\n        (item_data->>'price')::numeric,\r\n        item_data->'configuration',\r\n        NULLIF(item_data->>'product_id', '')::uuid,\r\n        (item_data->>'supplier_id')::uuid,\r\n        item_data->>'supplier_name'\r\n      )\r\n      ON CONFLICT (id) DO UPDATE SET\r\n        name = EXCLUDED.name,\r\n        quantity = EXCLUDED.quantity,\r\n        unit_price = EXCLUDED.unit_price,\r\n        configuration = EXCLUDED.configuration,\r\n        product_id = EXCLUDED.product_id,\r\n        supplier_id = EXCLUDED.supplier_id,\r\n        supplier_name = EXCLUDED.supplier_name;\r\n    END IF;\r\n  END LOOP;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_route_efficiency",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_route_efficiency()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Update route statistics and efficiency\r\n    UPDATE delivery_routes \r\n    SET \r\n        route_efficiency_score = (\r\n            SELECT \r\n                CASE \r\n                    WHEN total_deliveries = 0 THEN 0\r\n                    ELSE ROUND(\r\n                        (completed_deliveries::numeric / total_deliveries::numeric) * 100 * \r\n                        (1 - (COALESCE(route_distance, 0) / NULLIF(COALESCE(route_distance, 0) + 100, 0))), 2\r\n                    )\r\n                END\r\n        ),\r\n        current_load_items = (\r\n            SELECT COALESCE(SUM(di.quantity_to_deliver), 0)\r\n            FROM deliveries d\r\n            JOIN delivery_items di ON d.id = di.delivery_id\r\n            WHERE d.route_id = COALESCE(NEW.route_id, OLD.route_id) \r\n            AND di.item_status IN ('loaded', 'in_transit')\r\n        ),\r\n        updated_at = now()\r\n    WHERE id = COALESCE(NEW.route_id, OLD.route_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_sales_order_delivery_status",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_sales_order_delivery_status()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  -- Update sales order delivery status based on delivery items\r\n  -- Implementation depends on business logic\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_sales_order_item_totals",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_sales_order_item_totals()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nDECLARE\r\n    order_original_price DECIMAL(15,2);\r\n    order_items_subtotal DECIMAL(15,2);\r\n    order_discount_amount DECIMAL(15,2);\r\n    current_freight DECIMAL(15,2);\r\n    current_tax_percentage DECIMAL(5,2);\r\n    current_tax_amount DECIMAL(15,2);\r\n    current_grand_total DECIMAL(15,2);\r\n    current_final_price DECIMAL(15,2);\r\nBEGIN\r\n    -- Get current values to preserve UI calculations\r\n    SELECT \r\n        COALESCE(freight_charges, 0),\r\n        COALESCE(tax_percentage, 18.00),\r\n        COALESCE(tax_amount, 0),\r\n        COALESCE(grand_total, 0),\r\n        COALESCE(final_price, 0)\r\n    INTO \r\n        current_freight,\r\n        current_tax_percentage, \r\n        current_tax_amount,\r\n        current_grand_total,\r\n        current_final_price\r\n    FROM sales_orders \r\n    WHERE id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    -- Calculate ONLY item-level totals\r\n    SELECT \r\n        COALESCE(SUM(quantity * unit_price), 0),\r\n        COALESCE(SUM(quantity * COALESCE(final_price, unit_price)), 0)\r\n    INTO order_original_price, order_items_subtotal\r\n    FROM sales_order_items \r\n    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    order_discount_amount := order_original_price - order_items_subtotal;\r\n    \r\n    -- Update sales_orders - PRESERVE final_price if it was set by UI (includes tax + freight)\r\n    -- Only update final_price if it's currently 0 or matches items subtotal (meaning it wasn't set by UI)\r\n    UPDATE sales_orders SET\r\n        original_price = order_original_price,\r\n        discount_amount = order_discount_amount,\r\n        -- CRITICAL: Only update final_price if it appears to be unset or just item total\r\n        final_price = CASE \r\n            WHEN current_final_price = 0 OR current_final_price = order_items_subtotal THEN \r\n                order_items_subtotal + current_freight + current_tax_amount\r\n            ELSE \r\n                current_final_price  -- PRESERVE UI-calculated final_price\r\n        END,\r\n        -- Always preserve these UI-calculated fields\r\n        freight_charges = current_freight,\r\n        tax_percentage = current_tax_percentage,\r\n        tax_amount = current_tax_amount,\r\n        grand_total = CASE \r\n            WHEN current_grand_total = 0 THEN \r\n                order_items_subtotal + current_freight + current_tax_amount\r\n            ELSE \r\n                current_grand_total  -- PRESERVE UI-calculated grand_total\r\n        END,\r\n        updated_at = NOW()\r\n    WHERE id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_stock_adjustments_updated_at",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_stock_adjustments_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  NEW.updated_at = NOW();\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_updated_at_column",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_vendor_bill_status",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION public.update_vendor_bill_status()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    UPDATE vendor_bills \r\n    SET status = CASE \r\n        WHEN paid_amount = 0 THEN 'pending'\r\n        WHEN paid_amount >= total_amount THEN 'paid'\r\n        WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'\r\n        ELSE status\r\n    END,\r\n    updated_at = now()\r\n    WHERE id = COALESCE(NEW.vendor_bill_id, OLD.vendor_bill_id);\r\n\r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "apply_rls",
    "arguments": "wal jsonb, max_record_bytes integer",
    "return_type": "SETOF realtime.wal_rls",
    "definition": "CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))\n RETURNS SETOF realtime.wal_rls\n LANGUAGE plpgsql\nAS $function$\ndeclare\n-- Regclass of the table e.g. public.notes\nentity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;\n\n-- I, U, D, T: insert, update ...\naction realtime.action = (\n    case wal ->> 'action'\n        when 'I' then 'INSERT'\n        when 'U' then 'UPDATE'\n        when 'D' then 'DELETE'\n        else 'ERROR'\n    end\n);\n\n-- Is row level security enabled for the table\nis_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;\n\nsubscriptions realtime.subscription[] = array_agg(subs)\n    from\n        realtime.subscription subs\n    where\n        subs.entity = entity_;\n\n-- Subscription vars\nroles regrole[] = array_agg(distinct us.claims_role::text)\n    from\n        unnest(subscriptions) us;\n\nworking_role regrole;\nclaimed_role regrole;\nclaims jsonb;\n\nsubscription_id uuid;\nsubscription_has_access bool;\nvisible_to_subscription_ids uuid[] = '{}';\n\n-- structured info for wal's columns\ncolumns realtime.wal_column[];\n-- previous identity values for update/delete\nold_columns realtime.wal_column[];\n\nerror_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;\n\n-- Primary jsonb output for record\noutput jsonb;\n\nbegin\nperform set_config('role', null, true);\n\ncolumns =\n    array_agg(\n        (\n            x->>'name',\n            x->>'type',\n            x->>'typeoid',\n            realtime.cast(\n                (x->'value') #>> '{}',\n                coalesce(\n                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4\n                    (x->>'type')::regtype\n                )\n            ),\n            (pks ->> 'name') is not null,\n            true\n        )::realtime.wal_column\n    )\n    from\n        jsonb_array_elements(wal -> 'columns') x\n        left join jsonb_array_elements(wal -> 'pk') pks\n            on (x ->> 'name') = (pks ->> 'name');\n\nold_columns =\n    array_agg(\n        (\n            x->>'name',\n            x->>'type',\n            x->>'typeoid',\n            realtime.cast(\n                (x->'value') #>> '{}',\n                coalesce(\n                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4\n                    (x->>'type')::regtype\n                )\n            ),\n            (pks ->> 'name') is not null,\n            true\n        )::realtime.wal_column\n    )\n    from\n        jsonb_array_elements(wal -> 'identity') x\n        left join jsonb_array_elements(wal -> 'pk') pks\n            on (x ->> 'name') = (pks ->> 'name');\n\nfor working_role in select * from unnest(roles) loop\n\n    -- Update `is_selectable` for columns and old_columns\n    columns =\n        array_agg(\n            (\n                c.name,\n                c.type_name,\n                c.type_oid,\n                c.value,\n                c.is_pkey,\n                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')\n            )::realtime.wal_column\n        )\n        from\n            unnest(columns) c;\n\n    old_columns =\n            array_agg(\n                (\n                    c.name,\n                    c.type_name,\n                    c.type_oid,\n                    c.value,\n                    c.is_pkey,\n                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')\n                )::realtime.wal_column\n            )\n            from\n                unnest(old_columns) c;\n\n    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then\n        return next (\n            jsonb_build_object(\n                'schema', wal ->> 'schema',\n                'table', wal ->> 'table',\n                'type', action\n            ),\n            is_rls_enabled,\n            -- subscriptions is already filtered by entity\n            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),\n            array['Error 400: Bad Request, no primary key']\n        )::realtime.wal_rls;\n\n    -- The claims role does not have SELECT permission to the primary key of entity\n    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then\n        return next (\n            jsonb_build_object(\n                'schema', wal ->> 'schema',\n                'table', wal ->> 'table',\n                'type', action\n            ),\n            is_rls_enabled,\n            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),\n            array['Error 401: Unauthorized']\n        )::realtime.wal_rls;\n\n    else\n        output = jsonb_build_object(\n            'schema', wal ->> 'schema',\n            'table', wal ->> 'table',\n            'type', action,\n            'commit_timestamp', to_char(\n                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),\n                'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'\n            ),\n            'columns', (\n                select\n                    jsonb_agg(\n                        jsonb_build_object(\n                            'name', pa.attname,\n                            'type', pt.typname\n                        )\n                        order by pa.attnum asc\n                    )\n                from\n                    pg_attribute pa\n                    join pg_type pt\n                        on pa.atttypid = pt.oid\n                where\n                    attrelid = entity_\n                    and attnum > 0\n                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')\n            )\n        )\n        -- Add \"record\" key for insert and update\n        || case\n            when action in ('INSERT', 'UPDATE') then\n                jsonb_build_object(\n                    'record',\n                    (\n                        select\n                            jsonb_object_agg(\n                                -- if unchanged toast, get column name and value from old record\n                                coalesce((c).name, (oc).name),\n                                case\n                                    when (c).name is null then (oc).value\n                                    else (c).value\n                                end\n                            )\n                        from\n                            unnest(columns) c\n                            full outer join unnest(old_columns) oc\n                                on (c).name = (oc).name\n                        where\n                            coalesce((c).is_selectable, (oc).is_selectable)\n                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                    )\n                )\n            else '{}'::jsonb\n        end\n        -- Add \"old_record\" key for update and delete\n        || case\n            when action = 'UPDATE' then\n                jsonb_build_object(\n                        'old_record',\n                        (\n                            select jsonb_object_agg((c).name, (c).value)\n                            from unnest(old_columns) c\n                            where\n                                (c).is_selectable\n                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                        )\n                    )\n            when action = 'DELETE' then\n                jsonb_build_object(\n                    'old_record',\n                    (\n                        select jsonb_object_agg((c).name, (c).value)\n                        from unnest(old_columns) c\n                        where\n                            (c).is_selectable\n                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey\n                    )\n                )\n            else '{}'::jsonb\n        end;\n\n        -- Create the prepared statement\n        if is_rls_enabled and action <> 'DELETE' then\n            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then\n                deallocate walrus_rls_stmt;\n            end if;\n            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);\n        end if;\n\n        visible_to_subscription_ids = '{}';\n\n        for subscription_id, claims in (\n                select\n                    subs.subscription_id,\n                    subs.claims\n                from\n                    unnest(subscriptions) subs\n                where\n                    subs.entity = entity_\n                    and subs.claims_role = working_role\n                    and (\n                        realtime.is_visible_through_filters(columns, subs.filters)\n                        or (\n                          action = 'DELETE'\n                          and realtime.is_visible_through_filters(old_columns, subs.filters)\n                        )\n                    )\n        ) loop\n\n            if not is_rls_enabled or action = 'DELETE' then\n                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;\n            else\n                -- Check if RLS allows the role to see the record\n                perform\n                    -- Trim leading and trailing quotes from working_role because set_config\n                    -- doesn't recognize the role as valid if they are included\n                    set_config('role', trim(both '\"' from working_role::text), true),\n                    set_config('request.jwt.claims', claims::text, true);\n\n                execute 'execute walrus_rls_stmt' into subscription_has_access;\n\n                if subscription_has_access then\n                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;\n                end if;\n            end if;\n        end loop;\n\n        perform set_config('role', null, true);\n\n        return next (\n            output,\n            is_rls_enabled,\n            visible_to_subscription_ids,\n            case\n                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']\n                else '{}'\n            end\n        )::realtime.wal_rls;\n\n    end if;\nend loop;\n\nperform set_config('role', null, true);\nend;\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "broadcast_changes",
    "arguments": "topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    -- Declare a variable to hold the JSONB representation of the row\n    row_data jsonb := '{}'::jsonb;\nBEGIN\n    IF level = 'STATEMENT' THEN\n        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';\n    END IF;\n    -- Check the operation type and handle accordingly\n    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN\n        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);\n        PERFORM realtime.send (row_data, event_name, topic_name);\n    ELSE\n        RAISE EXCEPTION 'Unexpected operation type: %', operation;\n    END IF;\nEXCEPTION\n    WHEN OTHERS THEN\n        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;\nEND;\n\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "build_prepared_statement_sql",
    "arguments": "prepared_statement_name text, entity regclass, columns realtime.wal_column[]",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])\n RETURNS text\n LANGUAGE sql\nAS $function$\n      /*\n      Builds a sql string that, if executed, creates a prepared statement to\n      tests retrive a row from *entity* by its primary key columns.\n      Example\n          select realtime.build_prepared_statement_sql('public.notes', '{\"id\"}'::text[], '{\"bigint\"}'::text[])\n      */\n          select\n      'prepare ' || prepared_statement_name || ' as\n          select\n              exists(\n                  select\n                      1\n                  from\n                      ' || entity || '\n                  where\n                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '\n              )'\n          from\n              unnest(columns) pkc\n          where\n              pkc.is_pkey\n          group by\n              entity\n      $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "cast",
    "arguments": "val text, type_ regtype",
    "return_type": "jsonb",
    "definition": "CREATE OR REPLACE FUNCTION realtime.\"cast\"(val text, type_ regtype)\n RETURNS jsonb\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\n    declare\n      res jsonb;\n    begin\n      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;\n      return res;\n    end\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "check_equality_op",
    "arguments": "op realtime.equality_op, type_ regtype, val_1 text, val_2 text",
    "return_type": "boolean",
    "definition": "CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)\n RETURNS boolean\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\n      /*\n      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness\n      */\n      declare\n          op_symbol text = (\n              case\n                  when op = 'eq' then '='\n                  when op = 'neq' then '!='\n                  when op = 'lt' then '<'\n                  when op = 'lte' then '<='\n                  when op = 'gt' then '>'\n                  when op = 'gte' then '>='\n                  when op = 'in' then '= any'\n                  else 'UNKNOWN OP'\n              end\n          );\n          res boolean;\n      begin\n          execute format(\n              'select %L::'|| type_::text || ' ' || op_symbol\n              || ' ( %L::'\n              || (\n                  case\n                      when op = 'in' then type_::text || '[]'\n                      else type_::text end\n              )\n              || ')', val_1, val_2) into res;\n          return res;\n      end;\n      $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "is_visible_through_filters",
    "arguments": "columns realtime.wal_column[], filters realtime.user_defined_filter[]",
    "return_type": "boolean",
    "definition": "CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])\n RETURNS boolean\n LANGUAGE sql\n IMMUTABLE\nAS $function$\n    /*\n    Should the record be visible (true) or filtered out (false) after *filters* are applied\n    */\n        select\n            -- Default to allowed when no filters present\n            $2 is null -- no filters. this should not happen because subscriptions has a default\n            or array_length($2, 1) is null -- array length of an empty array is null\n            or bool_and(\n                coalesce(\n                    realtime.check_equality_op(\n                        op:=f.op,\n                        type_:=coalesce(\n                            col.type_oid::regtype, -- null when wal2json version <= 2.4\n                            col.type_name::regtype\n                        ),\n                        -- cast jsonb to text\n                        val_1:=col.value #>> '{}',\n                        val_2:=f.value\n                    ),\n                    false -- if null, filter does not match\n                )\n            )\n        from\n            unnest(filters) f\n            join unnest(columns) col\n                on f.column_name = col.name;\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "list_changes",
    "arguments": "publication name, slot_name name, max_changes integer, max_record_bytes integer",
    "return_type": "SETOF realtime.wal_rls",
    "definition": "CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)\n RETURNS SETOF realtime.wal_rls\n LANGUAGE sql\n SET log_min_messages TO 'fatal'\nAS $function$\n      with pub as (\n        select\n          concat_ws(\n            ',',\n            case when bool_or(pubinsert) then 'insert' else null end,\n            case when bool_or(pubupdate) then 'update' else null end,\n            case when bool_or(pubdelete) then 'delete' else null end\n          ) as w2j_actions,\n          coalesce(\n            string_agg(\n              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),\n              ','\n            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),\n            ''\n          ) w2j_add_tables\n        from\n          pg_publication pp\n          left join pg_publication_tables ppt\n            on pp.pubname = ppt.pubname\n        where\n          pp.pubname = publication\n        group by\n          pp.pubname\n        limit 1\n      ),\n      w2j as (\n        select\n          x.*, pub.w2j_add_tables\n        from\n          pub,\n          pg_logical_slot_get_changes(\n            slot_name, null, max_changes,\n            'include-pk', 'true',\n            'include-transaction', 'false',\n            'include-timestamp', 'true',\n            'include-type-oids', 'true',\n            'format-version', '2',\n            'actions', pub.w2j_actions,\n            'add-tables', pub.w2j_add_tables\n          ) x\n      )\n      select\n        xyz.wal,\n        xyz.is_rls_enabled,\n        xyz.subscription_ids,\n        xyz.errors\n      from\n        w2j,\n        realtime.apply_rls(\n          wal := w2j.data::jsonb,\n          max_record_bytes := max_record_bytes\n        ) xyz(wal, is_rls_enabled, subscription_ids, errors)\n      where\n        w2j.w2j_add_tables <> ''\n        and xyz.subscription_ids[1] is not null\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "quote_wal2json",
    "arguments": "entity regclass",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\n      select\n        (\n          select string_agg('' || ch,'')\n          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)\n          where\n            not (x.idx = 1 and x.ch = '\"')\n            and not (\n              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)\n              and x.ch = '\"'\n            )\n        )\n        || '.'\n        || (\n          select string_agg('' || ch,'')\n          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)\n          where\n            not (x.idx = 1 and x.ch = '\"')\n            and not (\n              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)\n              and x.ch = '\"'\n            )\n          )\n      from\n        pg_class pc\n        join pg_namespace nsp\n          on pc.relnamespace = nsp.oid\n      where\n        pc.oid = entity\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "send",
    "arguments": "payload jsonb, event text, topic text, private boolean",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  BEGIN\n    -- Set the topic configuration\n    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);\n\n    -- Attempt to insert the message\n    INSERT INTO realtime.messages (payload, event, topic, private, extension)\n    VALUES (payload, event, topic, private, 'broadcast');\n  EXCEPTION\n    WHEN OTHERS THEN\n      -- Capture and notify the error\n      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;\n  END;\nEND;\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "subscription_check_filters",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n    /*\n    Validates that the user defined filters for a subscription:\n    - refer to valid columns that the claimed role may access\n    - values are coercable to the correct column type\n    */\n    declare\n        col_names text[] = coalesce(\n                array_agg(c.column_name order by c.ordinal_position),\n                '{}'::text[]\n            )\n            from\n                information_schema.columns c\n            where\n                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity\n                and pg_catalog.has_column_privilege(\n                    (new.claims ->> 'role'),\n                    format('%I.%I', c.table_schema, c.table_name)::regclass,\n                    c.column_name,\n                    'SELECT'\n                );\n        filter realtime.user_defined_filter;\n        col_type regtype;\n\n        in_val jsonb;\n    begin\n        for filter in select * from unnest(new.filters) loop\n            -- Filtered column is valid\n            if not filter.column_name = any(col_names) then\n                raise exception 'invalid column for filter %', filter.column_name;\n            end if;\n\n            -- Type is sanitized and safe for string interpolation\n            col_type = (\n                select atttypid::regtype\n                from pg_catalog.pg_attribute\n                where attrelid = new.entity\n                      and attname = filter.column_name\n            );\n            if col_type is null then\n                raise exception 'failed to lookup type for column %', filter.column_name;\n            end if;\n\n            -- Set maximum number of entries for in filter\n            if filter.op = 'in'::realtime.equality_op then\n                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);\n                if coalesce(jsonb_array_length(in_val), 0) > 100 then\n                    raise exception 'too many values for `in` filter. Maximum 100';\n                end if;\n            else\n                -- raises an exception if value is not coercable to type\n                perform realtime.cast(filter.value, col_type);\n            end if;\n\n        end loop;\n\n        -- Apply consistent order to filters so the unique constraint on\n        -- (subscription_id, entity, filters) can't be tricked by a different filter order\n        new.filters = coalesce(\n            array_agg(f order by f.column_name, f.op, f.value),\n            '{}'\n        ) from unnest(new.filters) f;\n\n        return new;\n    end;\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "to_regrole",
    "arguments": "role_name text",
    "return_type": "regrole",
    "definition": "CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)\n RETURNS regrole\n LANGUAGE sql\n IMMUTABLE\nAS $function$ select role_name::regrole $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "topic",
    "arguments": "",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION realtime.topic()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\nselect nullif(current_setting('realtime.topic', true), '')::text;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "add_prefixes",
    "arguments": "_bucket_id text, _name text",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION storage.add_prefixes(_bucket_id text, _name text)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    prefixes text[];\nBEGIN\n    prefixes := \"storage\".\"get_prefixes\"(\"_name\");\n\n    IF array_length(prefixes, 1) > 0 THEN\n        INSERT INTO storage.prefixes (name, bucket_id)\n        SELECT UNNEST(prefixes) as name, \"_bucket_id\" ON CONFLICT DO NOTHING;\n    END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "can_insert_object",
    "arguments": "bucketid text, name text, owner uuid, metadata jsonb",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  INSERT INTO \"storage\".\"objects\" (\"bucket_id\", \"name\", \"owner\", \"metadata\") VALUES (bucketid, name, owner, metadata);\n  -- hack to rollback the successful insert\n  RAISE sqlstate 'PT200' using\n  message = 'ROLLBACK',\n  detail = 'rollback successful insert';\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "delete_prefix",
    "arguments": "_bucket_id text, _name text",
    "return_type": "boolean",
    "definition": "CREATE OR REPLACE FUNCTION storage.delete_prefix(_bucket_id text, _name text)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n    -- Check if we can delete the prefix\n    IF EXISTS(\n        SELECT FROM \"storage\".\"prefixes\"\n        WHERE \"prefixes\".\"bucket_id\" = \"_bucket_id\"\n          AND level = \"storage\".\"get_level\"(\"_name\") + 1\n          AND \"prefixes\".\"name\" COLLATE \"C\" LIKE \"_name\" || '/%'\n        LIMIT 1\n    )\n    OR EXISTS(\n        SELECT FROM \"storage\".\"objects\"\n        WHERE \"objects\".\"bucket_id\" = \"_bucket_id\"\n          AND \"storage\".\"get_level\"(\"objects\".\"name\") = \"storage\".\"get_level\"(\"_name\") + 1\n          AND \"objects\".\"name\" COLLATE \"C\" LIKE \"_name\" || '/%'\n        LIMIT 1\n    ) THEN\n    -- There are sub-objects, skip deletion\n    RETURN false;\n    ELSE\n        DELETE FROM \"storage\".\"prefixes\"\n        WHERE \"prefixes\".\"bucket_id\" = \"_bucket_id\"\n          AND level = \"storage\".\"get_level\"(\"_name\")\n          AND \"prefixes\".\"name\" = \"_name\";\n        RETURN true;\n    END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "delete_prefix_hierarchy_trigger",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION storage.delete_prefix_hierarchy_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    prefix text;\nBEGIN\n    prefix := \"storage\".\"get_prefix\"(OLD.\"name\");\n\n    IF coalesce(prefix, '') != '' THEN\n        PERFORM \"storage\".\"delete_prefix\"(OLD.\"bucket_id\", prefix);\n    END IF;\n\n    RETURN OLD;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "enforce_bucket_name_length",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nbegin\n    if length(new.name) > 100 then\n        raise exception 'bucket name \"%\" is too long (% characters). Max is 100.', new.name, length(new.name);\n    end if;\n    return new;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "extension",
    "arguments": "name text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION storage.extension(name text)\n RETURNS text\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\nDECLARE\n    _parts text[];\n    _filename text;\nBEGIN\n    SELECT string_to_array(name, '/') INTO _parts;\n    SELECT _parts[array_length(_parts,1)] INTO _filename;\n    RETURN reverse(split_part(reverse(_filename), '.', 1));\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "filename",
    "arguments": "name text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION storage.filename(name text)\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n_parts text[];\nBEGIN\n\tselect string_to_array(name, '/') into _parts;\n\treturn _parts[array_length(_parts,1)];\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "foldername",
    "arguments": "name text",
    "return_type": "text[]",
    "definition": "CREATE OR REPLACE FUNCTION storage.foldername(name text)\n RETURNS text[]\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\nDECLARE\n    _parts text[];\nBEGIN\n    -- Split on \"/\" to get path segments\n    SELECT string_to_array(name, '/') INTO _parts;\n    -- Return everything except the last segment\n    RETURN _parts[1 : array_length(_parts,1) - 1];\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_level",
    "arguments": "name text",
    "return_type": "integer",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_level(name text)\n RETURNS integer\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\nSELECT array_length(string_to_array(\"name\", '/'), 1);\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_prefix",
    "arguments": "name text",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_prefix(name text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\nSELECT\n    CASE WHEN strpos(\"name\", '/') > 0 THEN\n             regexp_replace(\"name\", '[\\/]{1}[^\\/]+\\/?$', '')\n         ELSE\n             ''\n        END;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_prefixes",
    "arguments": "name text",
    "return_type": "text[]",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)\n RETURNS text[]\n LANGUAGE plpgsql\n IMMUTABLE STRICT\nAS $function$\nDECLARE\n    parts text[];\n    prefixes text[];\n    prefix text;\nBEGIN\n    -- Split the name into parts by '/'\n    parts := string_to_array(\"name\", '/');\n    prefixes := '{}';\n\n    -- Construct the prefixes, stopping one level below the last part\n    FOR i IN 1..array_length(parts, 1) - 1 LOOP\n            prefix := array_to_string(parts[1:i], '/');\n            prefixes := array_append(prefixes, prefix);\n    END LOOP;\n\n    RETURN prefixes;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_size_by_bucket",
    "arguments": "",
    "return_type": "TABLE(size bigint, bucket_id text)",
    "definition": "CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()\n RETURNS TABLE(size bigint, bucket_id text)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    return query\n        select sum((metadata->>'size')::bigint) as size, obj.bucket_id\n        from \"storage\".objects as obj\n        group by obj.bucket_id;\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "list_multipart_uploads_with_delimiter",
    "arguments": "bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text",
    "return_type": "TABLE(key text, id text, created_at timestamp with time zone)",
    "definition": "CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)\n RETURNS TABLE(key text, id text, created_at timestamp with time zone)\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    RETURN QUERY EXECUTE\n        'SELECT DISTINCT ON(key COLLATE \"C\") * from (\n            SELECT\n                CASE\n                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN\n                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))\n                    ELSE\n                        key\n                END AS key, id, created_at\n            FROM\n                storage.s3_multipart_uploads\n            WHERE\n                bucket_id = $5 AND\n                key ILIKE $1 || ''%'' AND\n                CASE\n                    WHEN $4 != '''' AND $6 = '''' THEN\n                        CASE\n                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN\n                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE \"C\" > $4\n                            ELSE\n                                key COLLATE \"C\" > $4\n                            END\n                    ELSE\n                        true\n                END AND\n                CASE\n                    WHEN $6 != '''' THEN\n                        id COLLATE \"C\" > $6\n                    ELSE\n                        true\n                    END\n            ORDER BY\n                key COLLATE \"C\" ASC, created_at ASC) as e order by key COLLATE \"C\" LIMIT $3'\n        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "list_objects_with_delimiter",
    "arguments": "bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text",
    "return_type": "TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)",
    "definition": "CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text)\n RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    RETURN QUERY EXECUTE\n        'SELECT DISTINCT ON(name COLLATE \"C\") * from (\n            SELECT\n                CASE\n                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN\n                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))\n                    ELSE\n                        name\n                END AS name, id, metadata, updated_at\n            FROM\n                storage.objects\n            WHERE\n                bucket_id = $5 AND\n                name ILIKE $1 || ''%'' AND\n                CASE\n                    WHEN $6 != '''' THEN\n                    name COLLATE \"C\" > $6\n                ELSE true END\n                AND CASE\n                    WHEN $4 != '''' THEN\n                        CASE\n                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN\n                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE \"C\" > $4\n                            ELSE\n                                name COLLATE \"C\" > $4\n                            END\n                    ELSE\n                        true\n                END\n            ORDER BY\n                name COLLATE \"C\" ASC) as e order by name COLLATE \"C\" LIMIT $3'\n        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "objects_insert_prefix_trigger",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION storage.objects_insert_prefix_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    NEW.level := \"storage\".\"get_level\"(NEW.\"name\");\n\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "objects_update_prefix_trigger",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION storage.objects_update_prefix_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    old_prefixes TEXT[];\nBEGIN\n    -- Ensure this is an update operation and the name has changed\n    IF TG_OP = 'UPDATE' AND (NEW.\"name\" <> OLD.\"name\" OR NEW.\"bucket_id\" <> OLD.\"bucket_id\") THEN\n        -- Retrieve old prefixes\n        old_prefixes := \"storage\".\"get_prefixes\"(OLD.\"name\");\n\n        -- Remove old prefixes that are only used by this object\n        WITH all_prefixes as (\n            SELECT unnest(old_prefixes) as prefix\n        ),\n        can_delete_prefixes as (\n             SELECT prefix\n             FROM all_prefixes\n             WHERE NOT EXISTS (\n                 SELECT 1 FROM \"storage\".\"objects\"\n                 WHERE \"bucket_id\" = OLD.\"bucket_id\"\n                   AND \"name\" <> OLD.\"name\"\n                   AND \"name\" LIKE (prefix || '%')\n             )\n         )\n        DELETE FROM \"storage\".\"prefixes\" WHERE name IN (SELECT prefix FROM can_delete_prefixes);\n\n        -- Add new prefixes\n        PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    END IF;\n    -- Set the new level\n    NEW.\"level\" := \"storage\".\"get_level\"(NEW.\"name\");\n\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "operation",
    "arguments": "",
    "return_type": "text",
    "definition": "CREATE OR REPLACE FUNCTION storage.operation()\n RETURNS text\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    RETURN current_setting('storage.operation', true);\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "prefixes_insert_trigger",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION storage.prefixes_insert_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search",
    "arguments": "prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text",
    "return_type": "TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)",
    "definition": "CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\nAS $function$\ndeclare\n    can_bypass_rls BOOLEAN;\nbegin\n    SELECT rolbypassrls\n    INTO can_bypass_rls\n    FROM pg_roles\n    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);\n\n    IF can_bypass_rls THEN\n        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);\n    ELSE\n        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);\n    END IF;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_legacy_v1",
    "arguments": "prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text",
    "return_type": "TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)",
    "definition": "CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\ndeclare\n    v_order_by text;\n    v_sort_order text;\nbegin\n    case\n        when sortcolumn = 'name' then\n            v_order_by = 'name';\n        when sortcolumn = 'updated_at' then\n            v_order_by = 'updated_at';\n        when sortcolumn = 'created_at' then\n            v_order_by = 'created_at';\n        when sortcolumn = 'last_accessed_at' then\n            v_order_by = 'last_accessed_at';\n        else\n            v_order_by = 'name';\n        end case;\n\n    case\n        when sortorder = 'asc' then\n            v_sort_order = 'asc';\n        when sortorder = 'desc' then\n            v_sort_order = 'desc';\n        else\n            v_sort_order = 'asc';\n        end case;\n\n    v_order_by = v_order_by || ' ' || v_sort_order;\n\n    return query execute\n        'with folders as (\n           select path_tokens[$1] as folder\n           from storage.objects\n             where objects.name ilike $2 || $3 || ''%''\n               and bucket_id = $4\n               and array_length(objects.path_tokens, 1) <> $1\n           group by folder\n           order by folder ' || v_sort_order || '\n     )\n     (select folder as \"name\",\n            null as id,\n            null as updated_at,\n            null as created_at,\n            null as last_accessed_at,\n            null as metadata from folders)\n     union all\n     (select path_tokens[$1] as \"name\",\n            id,\n            updated_at,\n            created_at,\n            last_accessed_at,\n            metadata\n     from storage.objects\n     where objects.name ilike $2 || $3 || ''%''\n       and bucket_id = $4\n       and array_length(objects.path_tokens, 1) = $1\n     order by ' || v_order_by || ')\n     limit $5\n     offset $6' using levels, prefix, search, bucketname, limits, offsets;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_v1_optimised",
    "arguments": "prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text",
    "return_type": "TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)",
    "definition": "CREATE OR REPLACE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\ndeclare\n    v_order_by text;\n    v_sort_order text;\nbegin\n    case\n        when sortcolumn = 'name' then\n            v_order_by = 'name';\n        when sortcolumn = 'updated_at' then\n            v_order_by = 'updated_at';\n        when sortcolumn = 'created_at' then\n            v_order_by = 'created_at';\n        when sortcolumn = 'last_accessed_at' then\n            v_order_by = 'last_accessed_at';\n        else\n            v_order_by = 'name';\n        end case;\n\n    case\n        when sortorder = 'asc' then\n            v_sort_order = 'asc';\n        when sortorder = 'desc' then\n            v_sort_order = 'desc';\n        else\n            v_sort_order = 'asc';\n        end case;\n\n    v_order_by = v_order_by || ' ' || v_sort_order;\n\n    return query execute\n        'with folders as (\n           select (string_to_array(name, ''/''))[level] as name\n           from storage.prefixes\n             where lower(prefixes.name) like lower($2 || $3) || ''%''\n               and bucket_id = $4\n               and level = $1\n           order by name ' || v_sort_order || '\n     )\n     (select name,\n            null as id,\n            null as updated_at,\n            null as created_at,\n            null as last_accessed_at,\n            null as metadata from folders)\n     union all\n     (select path_tokens[level] as \"name\",\n            id,\n            updated_at,\n            created_at,\n            last_accessed_at,\n            metadata\n     from storage.objects\n     where lower(objects.name) like lower($2 || $3) || ''%''\n       and bucket_id = $4\n       and level = $1\n     order by ' || v_order_by || ')\n     limit $5\n     offset $6' using levels, prefix, search, bucketname, limits, offsets;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_v2",
    "arguments": "prefix text, bucket_name text, limits integer, levels integer, start_after text",
    "return_type": "TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)",
    "definition": "CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text)\n RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    RETURN query EXECUTE\n        $sql$\n        SELECT * FROM (\n            (\n                SELECT\n                    split_part(name, '/', $4) AS key,\n                    name || '/' AS name,\n                    NULL::uuid AS id,\n                    NULL::timestamptz AS updated_at,\n                    NULL::timestamptz AS created_at,\n                    NULL::jsonb AS metadata\n                FROM storage.prefixes\n                WHERE name COLLATE \"C\" LIKE $1 || '%'\n                AND bucket_id = $2\n                AND level = $4\n                AND name COLLATE \"C\" > $5\n                ORDER BY prefixes.name COLLATE \"C\" LIMIT $3\n            )\n            UNION ALL\n            (SELECT split_part(name, '/', $4) AS key,\n                name,\n                id,\n                updated_at,\n                created_at,\n                metadata\n            FROM storage.objects\n            WHERE name COLLATE \"C\" LIKE $1 || '%'\n                AND bucket_id = $2\n                AND level = $4\n                AND name COLLATE \"C\" > $5\n            ORDER BY name COLLATE \"C\" LIMIT $3)\n        ) obj\n        ORDER BY name COLLATE \"C\" LIMIT $3;\n        $sql$\n        USING prefix, bucket_name, limits, levels, start_after;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "update_updated_at_column",
    "arguments": "",
    "return_type": "trigger",
    "definition": "CREATE OR REPLACE FUNCTION storage.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    NEW.updated_at = now();\n    RETURN NEW; \nEND;\n$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_decrypt",
    "arguments": "message bytea, additional bytea, key_id bigint, context bytea, nonce bytea",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_decrypt_by_id$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_encrypt",
    "arguments": "message bytea, additional bytea, key_id bigint, context bytea, nonce bytea",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_encrypt_by_id$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_noncegen",
    "arguments": "",
    "return_type": "bytea",
    "definition": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_noncegen$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "create_secret",
    "arguments": "new_secret text, new_name text, new_description text, new_key_id uuid",
    "return_type": "uuid",
    "definition": "CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  rec record;\nBEGIN\n  INSERT INTO vault.secrets (secret, name, description)\n  VALUES (\n    new_secret,\n    new_name,\n    new_description\n  )\n  RETURNING * INTO rec;\n  UPDATE vault.secrets s\n  SET secret = encode(vault._crypto_aead_det_encrypt(\n    message := convert_to(rec.secret, 'utf8'),\n    additional := convert_to(s.id::text, 'utf8'),\n    key_id := 0,\n    context := 'pgsodium'::bytea,\n    nonce := rec.nonce\n  ), 'base64')\n  WHERE id = rec.id;\n  RETURN rec.id;\nEND\n$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "update_secret",
    "arguments": "secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid",
    "return_type": "void",
    "definition": "CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  decrypted_secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = secret_id);\nBEGIN\n  UPDATE vault.secrets s\n  SET\n    secret = CASE WHEN new_secret IS NULL THEN s.secret\n                  ELSE encode(vault._crypto_aead_det_encrypt(\n                    message := convert_to(new_secret, 'utf8'),\n                    additional := convert_to(s.id::text, 'utf8'),\n                    key_id := 0,\n                    context := 'pgsodium'::bytea,\n                    nonce := s.nonce\n                  ), 'base64') END,\n    name = coalesce(new_name, s.name),\n    description = coalesce(new_description, s.description),\n    updated_at = now()\n  WHERE s.id = secret_id;\nEND\n$function$\n"
  }
]