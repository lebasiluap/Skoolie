begin;
do $test$
declare roster jsonb; uid uuid; denied boolean;
begin
 select id into uid from auth.users where email='lebasiluap@gmail.com';
 perform set_config('request.jwt.claim.sub',uid::text,true);
 roster:=public.admin_registered_users();
 if jsonb_array_length(roster)<>(select count(*) from auth.users where deleted_at is null) then
  raise exception 'Roster omits registrations';
 end if;
 if exists(select 1 from jsonb_array_elements(roster) r group by r->>'id' having count(*)>1) then
  raise exception 'Duplicate account';
 end if;
 if exists(select 1 from jsonb_array_elements(roster) r where r ?| array['encrypted_password','raw_user_meta_data','raw_app_meta_data','push_token']) then
  raise exception 'Private fields exposed';
 end if;
 select id into uid from auth.users where email<>'lebasiluap@gmail.com' limit 1;
 if uid is not null then
  perform set_config('request.jwt.claim.sub',uid::text,true);
  denied:=false;
  begin perform public.admin_registered_users(); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Non-admin access'; end if;
 end if;
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;
 begin perform public.admin_registered_users(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Unauthenticated access'; end if;
 if has_function_privilege('anon','public.admin_registered_users()','execute') then raise exception 'Anonymous grant'; end if;
end $test$;
select 'PASS: complete, unique, minimal admin-only roster' as result;
rollback;
