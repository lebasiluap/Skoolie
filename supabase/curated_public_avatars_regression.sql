begin;
set local statement_timeout='15s';
select set_config('request.jwt.claim.sub',id::text,true) from auth.users where email='testskoolie@gmail.com';
set local role authenticated;
do $$
declare r record; result jsonb; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Missing test identity'; end if;
 for r in select * from public.get_public_profile(uid) loop
   if r.avatar_url !~ '^preset:([1-9]|[12][0-9]|30)$' then raise exception 'Public profile leaked photo'; end if;
 end loop;
 for r in select * from public.get_leaderboard(200) loop
   if r.avatar_url !~ '^preset:([1-9]|[12][0-9]|30)$' then raise exception 'Leaderboard leaked photo'; end if;
 end loop;
 for r in select * from public.get_weekly_league() loop
   if r.avatar_url !~ '^preset:([1-9]|[12][0-9]|30)$' then raise exception 'Weekly league leaked photo'; end if;
 end loop;
 result:=public.get_tournament();
 if exists(select 1 from jsonb_array_elements(coalesce(result->'entrants','[]'::jsonb)) x
   where x->>'avatar_url' !~ '^preset:([1-9]|[12][0-9]|30)$') then raise exception 'Tournament leaked photo'; end if;
 begin
   perform app_private.curated_avatar(null,uid);
   raise exception 'Private helper exposed';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
select 'PASS: authenticated profile, leaderboard, weekly league and tournament; private helper denied; tournament side effects rolled back' as result;
