-- Execute as the database owner. All fixtures and rewards MUST be rolled back.
-- Never replace ROLLBACK with COMMIT. No Auth credentials/config are changed.
begin;
set local statement_timeout='8s';
do $test$
declare
  uid uuid; candidate uuid; qid uuid; cid uuid; n bigint; blocked boolean; award integer;
begin
  for candidate in select id from public.user_profiles loop
    perform set_config('request.jwt.claim.sub',candidate::text,true);
    if not public.is_admin() then uid:=candidate; exit; end if;
  end loop;
  if uid is null then raise exception 'A non-admin profile fixture is required'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  select id into qid from public.questions limit 1;
  select id into cid from public.case_studies limit 1;
  if qid is null or cid is null then raise exception 'Released question and case fixtures required'; end if;
  update public.user_profiles set current_streak=5,longest_streak=7,
    last_active_date=(now() at time zone 'UTC')::date-1,streak_freezes=4,
    frozen_dates='{}',tier=0,tier_score=0 where id=uid;
  insert into public.content_quarantine(content_type,content_id,reason)
    values('question',qid,'rolled_back_security_regression'),('case_study',cid,'rolled_back_security_regression');
  set local role authenticated;
  select count(*) into n from public.user_profiles where id=uid;
  if n<>1 then raise exception 'Own profile unreadable'; end if;
  update public.user_profiles set sound_enabled=not sound_enabled where id=uid;
  if not found then raise exception 'Preference update failed'; end if;
  -- Even a plausible +1 must come from verified completion, not REST.
  blocked:=false;
  begin update public.user_profiles set current_streak=6,longest_streak=7,
    last_active_date=(now() at time zone 'UTC')::date where id=uid;
  exception when insufficient_privilege then blocked:=true;end;
  if not blocked then raise exception 'Client-authored study day accepted';end if;
  update public.user_profiles set current_streak=current_streak where id=uid;
  blocked:=false;
  begin update public.user_profiles set streak_freezes=9999 where id=uid;
  exception when invalid_parameter_value then blocked:=true; end;
  if not blocked then raise exception 'Freeze inflation accepted'; end if;
  blocked:=false;
  begin update public.user_profiles set current_streak=9999,longest_streak=9999 where id=uid;
  exception when invalid_parameter_value then blocked:=true; end;
  if not blocked then raise exception 'Streak inflation accepted'; end if;
  blocked:=false;
  begin update public.user_profiles set tier=9999,tier_score=9999999 where id=uid;
  exception when invalid_parameter_value then blocked:=true; end;
  if not blocked then raise exception 'Tier inflation accepted'; end if;
  blocked:=false;
  begin update public.user_profiles set xp=xp+1 where id=uid;
  exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'Direct XP accepted'; end if;
  blocked:=false;
  begin perform public.credit_xp(null,1,1,false,0,0);
  exception when raise_exception then blocked:=true; end;
  if not blocked then raise exception 'Null reward kind accepted'; end if;
  award:=public.credit_xp('mcq',1,1,false,0,0);
  if award<1 then raise exception 'Valid reward rejected'; end if;
  insert into public.user_profiles(id,email,full_name,profession,study_year,country)
    select id,email,full_name,profession,study_year,country from public.user_profiles where id=uid
    on conflict(id) do update set full_name=excluded.full_name,profession=excluded.profession,
      study_year=excluded.study_year,country=excluded.country;
  if not found then raise exception 'Onboarding upsert failed'; end if;
  select count(*) into n from public.questions_base where id=qid;
  if n<>0 then raise exception 'Base question quarantine leak'; end if;
  select count(*) into n from public.questions where id=qid;
  if n<>0 then raise exception 'Question view quarantine leak'; end if;
  select count(*) into n from public.get_questions_by_ids(array[qid],1);
  if n<>0 then raise exception 'ID RPC quarantine leak'; end if;
  select count(*) into n from public.case_studies_base where id=cid;
  if n<>0 then raise exception 'Base case quarantine leak'; end if;
  select count(*) into n from public.case_studies where id=cid;
  if n<>0 then raise exception 'Case view quarantine leak'; end if;
  select count(*) into n from public.search_questions('heart','medicine',null,5);
  select count(*) into n from public.admin_user_stats();
  if n<>0 then raise exception 'Admin statistics leaked'; end if;
  reset role;
end $test$;
select 'PASS: profile, onboarding, progress, reward and quarantine regression matrix; fixtures rolled back' result;
rollback;
