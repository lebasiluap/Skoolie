-- Existing privileged app RPCs use unqualified public relations. Preserve
-- those bindings, but explicitly put pg_temp LAST so temporary relations
-- cannot shadow public tables. No function bodies, signatures or ACLs change.
set lock_timeout='2s';
set statement_timeout='10s';
do $harden$
declare target record;
begin
  for target in
    select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proconfig @> array['search_path=public']
  loop
    execute format('alter function %I.%I(%s) set search_path = pg_catalog, public, pg_temp',
      target.nspname,target.proname,target.args);
  end loop;
end $harden$;
