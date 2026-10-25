-- Controlled, known-outcome fixtures; all cohort/claim/progress changes roll back.
begin;
set local statement_timeout='15s';
do $test$
declare u uuid; prof text; bucket text; ids text[]; issued jsonb; replay jsonb; result jsonb;
 answers jsonb; xp_before integer; xp_after integer; sid uuid; blocked boolean;
begin
 for u in select id from public.user_profiles loop
   perform set_config('request.jwt.claim.sub',u::text,true);
   exit when not public.is_admin();
 end loop;
 select profession,coalesce(study_year,'practitioner'),xp into prof,bucket,xp_before from public.user_profiles where id=u;
 select array_agg(id::text) into ids from (select id from public.questions where question_type='mcq'
   and professions @>array[prof] and access_key is null and (region is null or region='universal')
   and correct_answer ~ '^[A-D]$' limit 3) q;
 if cardinality(ids)<>3 then raise exception 'Missing released fixtures'; end if;
 insert into public.daily_challenges(day,profession,year_bucket,question_ids)
 values(current_date,prof,bucket,ids::uuid[]) on conflict(day,profession,year_bucket) do update set question_ids=excluded.question_ids;
 delete from public.challenge_claims where user_id=u and day=current_date;
 set local role authenticated;
 issued:=public.begin_verified_daily_challenge(gen_random_uuid(),'mcq',ids);
 replay:=public.begin_verified_daily_challenge(gen_random_uuid(),'mcq',ids);
 if issued<>replay then raise exception 'Multiple daily sessions issued'; end if;
 blocked:=false;
 begin perform public.begin_verified_daily_challenge(gen_random_uuid(),'mcq',array[ids[1]]);
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Arbitrary daily set accepted'; end if;
 reset role;
 sid:=(issued->>'session_id')::uuid;
 select jsonb_object_agg(key,value->>'key') into answers from app_private.verified_sessions s,
   lateral jsonb_each(s.snapshot) where s.id=sid;
 update app_private.verified_sessions set reward_day=current_date-1 where id=sid;
 set local role authenticated;
 blocked:=false;
 begin perform public.finish_verified_session(sid,answers);
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Stale challenge day accepted'; end if;
 reset role;
 update app_private.verified_sessions set reward_day=current_date where id=sid;
 set local role authenticated;
 result:=public.finish_verified_session(sid,answers);
 if result<>public.finish_verified_session(sid,answers) then raise exception 'Challenge replay differs'; end if;
 blocked:=false;
 begin perform public.begin_verified_daily_challenge(gen_random_uuid(),'mcq',ids);
 exception when invalid_parameter_value then blocked:=true; end;
 if not blocked then raise exception 'Second completed daily attempt accepted'; end if;
 reset role;
 select xp into xp_after from public.user_profiles where id=u;
 if xp_after-xp_before<>(result->>'xp')::integer or (result->>'score')::integer<>3 then raise exception 'Incorrect daily payout'; end if;
 if not exists(select 1 from public.challenge_claims where user_id=u and day=current_date and completed and score=3 and total=3 and xp=(result->>'xp')::integer)
 then raise exception 'Daily claim/result inconsistent'; end if;
 if not exists(select 1 from public.quiz_sessions where id=(result->>'quiz_session_id')::uuid and mode='daily_challenge')
 then raise exception 'Wrong saved challenge mode'; end if;
end $test$;
select 'PASS: exact daily set, one issuance across requests, stale day rejection, server grade, one payout, claim and receipt replay; ALL rolled back' result;
rollback;
