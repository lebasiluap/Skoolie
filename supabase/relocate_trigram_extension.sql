-- No app RPC uses pg_trgm routines by name; current search uses full-text
-- search. Existing indexes retain their operator/opclass OID dependencies.
-- pg_net is managed and non-relocatable, so deliberately leave it alone.
set lock_timeout = '2s';
set statement_timeout = '10s';
alter extension pg_trgm set schema extensions;
